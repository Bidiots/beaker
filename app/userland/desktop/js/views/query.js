import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import queryCSS from '../../css/views/query.css.js'
import { removeMarkdown } from 'beaker://app-stdlib/vendor/remove-markdown.js'
import { shorten, makeSafe, toNiceUrl } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'

export class QueryView extends LitElement {
  static get properties () {
    return {
      contentType: {type: String, attribute: 'content-type'},
      title: {type: String},
      createIcon: {type: String, attribute: 'create-icon'},
      createLabel: {type: String, attribute: 'create-label'},
      renderMode: {type: String, attribute: 'render-mode'},
      limit: {type: Number},
      filter: {type: String},
      sources: {type: Array},
      results: {type: Array},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'},
      showViewMore: {type: Boolean, attribute: 'show-view-more'},
      queryId: {type: Number, attribute: 'query-id'}
    }
  }

  static get styles () {
    return queryCSS
  }

  constructor () {
    super()
    this.contentType = undefined
    this.title = ''
    this.createIcon = ''
    this.createLabel = ''
    this.renderMode = 'row'
    this.limit = 50
    this.filter = undefined
    this.sources = []
    this.results = undefined
    this.hideEmpty = false
    this.showViewMore = false
    this.activeQuery = undefined
    this.abortController = undefined
  }

  get isLoading () {
    return !!this.activeQuery
  }

  async load () {
    this.queueQuery()
  }

  updated (changedProperties) {
    if (typeof this.results === 'undefined' && this.sources) {
      this.queueQuery()
    } else if (changedProperties.has('filter') || changedProperties.get('filter') !== this.filter) {
      this.queueQuery()
    } else if (changedProperties.has('sources') && !isArrayEq(this.sources, changedProperties.get('sources'))) {
      this.queueQuery()
    }
  }

  queueQuery () {
    if (!this.activeQuery) {
      this.activeQuery = this.query()
      this.requestUpdate()
    } else {
      if (this.abortController) this.abortController.abort()
      this.activeQuery = this.activeQuery.catch(e => undefined).then(r => {
        this.activeQuery = undefined
        this.queueQuery()
      })
    }
  }

  async query () {
    this.abortController = new AbortController()
    this.results = []/*await this[`query_${this.contentType}`]({
      sources: this.sources,
      filter: this.filter,
      limit: this.limit,
      signal: this.abortController.signal
    })*/
    this.activeQuery = undefined
    emit(this, 'load-finished')
  }

  // rendering
  // =

  render () {
    if (!this.results) {
      return html``
    }
    if (!this.results.length) {
      if (this.hideEmpty) return html``
      return html`
        <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
        <h2>
          ${this.showViewMore ? html`
            <a @click=${e => emit(this, 'view-more', {detail: {contentType: this.contentType}})}>
              ${this.title}
            </a>
          ` : html`
            <span>${this.title}</span>
          `}
        </h2>
        <div class="results empty">
          ${this.filter ? html`
            <span>No matches found for "${this.filter}".</div></span>
          ` : html`
            <span>Click "${this.createLabel}" to get started</div></span>
          `}
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <h2>
        ${this.showViewMore ? html`
          <a @click=${e => emit(this, 'view-more', {detail: {contentType: this.contentType}})}>
            ${this.title}
          </a>
        ` : html`
          <span>${this.title}</span>
        `}
      </h2>
      ${this.renderResults()}
    `
  }

  renderResults() {
    if (this.renderMode === 'simple-list') {
      return html`
        <div class="results simple-list">
          ${repeat(this.results, result => result.href, result => this.renderResultAsSimpleList(result))}
        </div>
      `
    }
    if (this.renderMode === 'simple-grid') {
      return html`
        <div class="results simple-grid">
          ${repeat(this.results, result => result.href, result => this.renderResultAsSimpleGrid(result))}
        </div>
      `
    }
    if (this.renderMode === 'compact-row') {
      return html`
        <div class="results compact-rows">
          ${repeat(this.results, result => result.href, result => this.renderResultAsCompactRow(result))}
        </div>
      `
    }
    return html`
      <div class="results rows">
        ${repeat(this.results, result => result.href, result => this.renderResultAsRow(result))}
      </div>
    `
  }

  renderResultAsRow (result) {
    var excerpt = result.excerpt || result.description
    return html`
      <div class="result row">
        <a class="thumb" href=${result.href} title=${result.title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="info">
          <div class="title"><a href=${result.href}>${unsafeHTML(result.title)}</a></div>
          ${result.href !== result.url ? html`
            <div class="href"><a href=${result.href}>${unsafeHTML(toNiceUrl(result.href))}</a></div>
          ` : ''}
          <div class="origin">
            ${result.author.url === 'hyper://system/' ? html`
              <span class="sysicon fas fa-fw fa-lock"></span>
            ` : html`
              <img class="favicon" src="${result.author.url}thumb">
            `}
            <a class="author" href=${result.author.url} title=${result.author.title}>
              ${result.author.title}
            </a>
            <a class="path" href=${result.href}>
              ${(new URL(result.url)).pathname}
            </a>
          </div>
          ${excerpt ? html`<div class="excerpt">${unsafeHTML(excerpt)}</div>` : ''}
        </div>
      </a>
    `
  }

  renderResultAsCompactRow (result) {
    var excerpt = result.excerpt || result.description
    return html`
      <div class="result compact-row">
        <a class="thumb" href=${result.href} title=${result.title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="title"><a href=${result.href}>${unsafeHTML(result.title)}</a></div>
        ${result.href !== result.url ? html`
          <div class="href"><a href=${result.href}>${unsafeHTML(toNiceUrl(result.href))}</a></div>
        ` : html`
          <div class="excerpt">${unsafeHTML(excerpt)}</div>
        `}
        <div class="origin">
          ${result.author.url === 'hyper://system/' ? html`
            <span class="sysicon fas fa-fw fa-lock"></span>
          ` : html`
            <img class="favicon" src="${result.author.url}thumb">
          `}
          <a class="author" href=${result.author.url} title=${result.author.title}>
            ${result.author.title}
          </a>
        </div>
        <div class="date">${niceDate(result.ctime)}</div>
      </a>
    `
  }

  renderResultAsSimpleList (result) {
    var excerpt = result.excerpt || result.description
    return html`
      <div class="result simple-list-item">
        <a class="thumb" href=${result.href} title=${result.title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="title"><a href=${result.href}>${unsafeHTML(result.title)}</a></div>
        ${result.href !== result.url ? html`
          <div class="href"><a href=${result.href}>${unsafeHTML(toNiceUrl(result.href))}</a></div>
        ` : html`
          <div class="excerpt">${unsafeHTML(excerpt)}</div>
        `}
      </a>
    `
  }

  renderResultAsSimpleGrid (result) {
    return html`
      <div class="result simple-grid-item">
        <a class="thumb" href=${result.href} title=${result.title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="title"><a href=${result.href}>${unsafeHTML(result.title)}</a></div>
      </a>
    `
  }

  renderResultAsCard (result) {
    var excerpt = result.excerpt || result.description
    return html`
      <div class="result card">
        <a class="thumb" href=${result.href} title=${result.title}>
          ${this.renderResultThumb(result)}
        </a>
        <div class="info">
          <div class="title"><a href=${result.href}>${unsafeHTML(result.title)}</a></div>
          <div class="origin">
            ${result.author.url === 'hyper://system/' ? html`
              <span class="sysicon fas fa-fw fa-lock"></span>
            ` : html`
              <img class="favicon" src="${result.author.url}thumb">
            `}
            <a class="author" href=${result.author.url} title=${result.author.title}>
              ${result.author.title}
            </a>
          </div>
          ${excerpt ? html`<div class="excerpt">${unsafeHTML(excerpt)}</div>` : ''}
        </div>
      </a>
    `
  }

  renderResultThumb (result) {
    if (/\.(png|jpe?g|gif)$/.test(result.href)) {
      return html`<img src=${result.href}>`
    }
    var path = (new URL(result.url)).pathname
    var icon = 'far fa-file'
    if (path.startsWith('/blog/')) {
      icon = 'fas fa-blog'
    } else if (path.startsWith('/pages/')) {
      icon = 'far fa-file'
    } else if (path.startsWith('/bookmarks/')) {
      icon = 'far fa-star'
    }
    return html`
      <span class="icon">
        <span class=${icon}></span>
      </span>
    `
  }

  // queries
  // =

  async query_bookmarks ({sources, filter, limit, offset, signal}) {
    var filterRegexp = filter ? new RegExp(filter, 'gi') : undefined
    var candidates = await beaker.hyperdrive.query({
      type: 'file',
      drive: sources,
      path: ['/bookmarks/*.goto'],
      sort: 'ctime',
      reverse: true,
      limit: filter ? undefined : limit,
      offset: filter ? undefined : offset
    })
  
    var results = []
    for (let candidate of candidates) {
      if (signal && signal.aborted) throw new AbortError()
      let href = makeSafe(candidate.stat.metadata.href || '')
      let title = makeSafe(candidate.stat.metadata.title || candidate.path.split('/').pop())
      let description = makeSafe(candidate.stat.metadata.description || '')
      if (!href) continue
      if (filterRegexp) {
        if (!filterRegexp.test(href) && !filterRegexp.test(title) && !filterRegexp.test(description)) continue
      }
      results.push({
        url: makeSafe(candidate.url),
        href,
        title,
        description,
        ctime: candidate.stat.ctime,
        author: {
          url: candidate.drive,
          title: await getDriveTitle(candidate.drive)
        }
      })
    }
  
    if (filter && (offset || limit)) {
      offset = offset || 0
      results = results.slice(offset, offset + limit)
    }
  
    return results
  }

  async query_plaintext (path, {sources, filter, limit, offset, signal}) {
    var filterRegexp = filter ? new RegExp(filter, 'gi') : undefined
    var candidates = await beaker.hyperdrive.query({
      type: 'file',
      drive: sources,
      path,
      sort: 'ctime',
      reverse: true,
      limit: filter ? undefined : limit,
      offset: filter ? undefined : offset
    })
  
    var results = []
    for (let candidate of candidates) {
      if (signal && signal.aborted) throw new AbortError()
      let title = makeSafe(candidate.stat.metadata.title || candidate.path.split('/').pop())
      let description = makeSafe(candidate.stat.metadata.description || '')
      let excerpt = ''
      if (candidate.path.endsWith('md')) {
        excerpt = makeSafe(removeMarkdown(removeFirstMdHeader(await beaker.hyperdrive.readFile(candidate.url, 'utf8').catch(e => ''))))
      } else if (candidate.path.endsWith('txt')) {
        excerpt = makeSafe(await beaker.hyperdrive.readFile(candidate.url, 'utf8').catch(e => ''))
      }
      if (filterRegexp) {
        let matches = {
          title: matchAndSliceString(filter, filterRegexp, title),
          description: matchAndSliceString(filter, filterRegexp, description),
          excerpt: matchAndSliceString(filter, filterRegexp, excerpt)
        }
        if (!Object.values(matches).reduce((acc, v) => v || acc, false)) continue
        title = matches.title || title
        description = matches.description
        excerpt = matches.excerpt || shorten(excerpt, 200)
      } else {
        excerpt = shorten(excerpt, 200)
      }
      results.push({
        url: makeSafe(candidate.url),
        href: makeSafe(candidate.url),
        title,
        excerpt,
        ctime: candidate.stat.ctime,
        author: {
          url: candidate.drive,
          title: await getDriveTitle(candidate.drive)
        }
      })
    }
  
    if (filter && (offset || limit)) {
      offset = offset || 0
      results = results.slice(offset, offset + limit)
    }
  
    return results

  }

  async query_blogposts (opts) {
    return this.query_plaintext('/blog/*.md', opts)
  }

  async query_images ({sources, filter, limit, offset, signal}) {
    var filterRegexp = filter ? new RegExp(filter, 'gi') : undefined
    var candidates = await beaker.hyperdrive.query({
      type: 'file',
      drive: sources,
      path: ['/images/*.png', '/images/*.jpg', '/images/*.jpeg', '/images/*.gif'],
      sort: 'ctime',
      reverse: true,
      limit: filter ? undefined : limit,
      offset: filter ? undefined : offset
    })
  
    var results = []
    for (let candidate of candidates) {
      if (signal && signal.aborted) throw new AbortError()
      let title = makeSafe(candidate.stat.metadata.title || candidate.path.split('/').pop())
      let description = makeSafe(candidate.stat.metadata.description || '')
      if (filterRegexp) {
        if (!filterRegexp.test(title) && !filterRegexp.test(description)) continue
      }
      results.push({
        url: makeSafe(candidate.url),
        href: makeSafe(candidate.url),
        title,
        description,
        ctime: candidate.stat.ctime,
        author: {
          url: candidate.drive,
          title: await getDriveTitle(candidate.drive)
        }
      })
    }
  
    if (filter && (offset || limit)) {
      offset = offset || 0
      results = results.slice(offset, offset + limit)
    }
  
    return results
  }

  async query_pages (opts) {
    return this.query_plaintext(
      ['/pages/*.md', '/pages/*.html'],
      opts
    )
  }

  // events
  // =

}

customElements.define('query-view', QueryView)

function isArrayEq (a, b) {
  return a.sort().toString() == b.sort().toString() 
}

function filterToRegex (filter) {
  return new RegExp(filter, 'gi')
}

function removeFirstMdHeader (str = '') {
  return str.replace(/(^#\s.*\r?\n)/, '')
}

var today = (new Date()).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
var yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
function niceDate (ts) {
  var date = (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return date
}

let _driveTitleCache = {}
async function getDriveTitle (url) {
  if (_driveTitleCache[url]) return _driveTitleCache[url]
  _driveTitleCache[url] = beaker.hyperdrive.getInfo(url).then(info => info.title)
  return _driveTitleCache[url]
}

function matchAndSliceString (filter, re, str) {
  if (!str) return false
  let match = re.exec(str)
  if (!match) return false
  let matchStart = re.lastIndex - filter.length
  let matchEnd = re.lastIndex
  let phraseStart = matchStart - 80
  let phraseEnd = matchEnd + 130
  let strLen = str.length
  str = str.slice(Math.max(0, phraseStart), matchStart) + `<mark>${str.slice(matchStart, matchEnd)}</mark>` + str.slice(matchEnd, Math.min(phraseEnd, strLen))
  if (phraseStart > 0) str = '...' + str
  if (phraseEnd < strLen) str = str + '...'
  return str
}

const DEBUG_QUERIES = [
  {
    title: 'Feed',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: '/microblog/*.md',
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })


      var results = []
      for (let candidate of candidates) {
        let content = await beaker.hyperdrive.readFile(candidate.url, 'utf8').catch(e => undefined)
        if (filter) {
          content = removeMarkdown(content || '')
          content = matchAndSliceString(filter, content)
          if (!content) continue
        } else {
          content = beaker.markdown.toHTML(content || '')
        }
        candidate.driveTitle = await getDriveTitle(candidate.drive)
        candidate.content = content
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }

      return results
    },
    views: {
      card (row) {
        var dateFormatter = new Intl.DateTimeFormat('en-us', {day: "numeric", month: "short", year: "numeric",})
        var timeFormatter = new Intl.DateTimeFormat('en-US', {hour12: true, hour: "2-digit", minute: "2-digit"})
        return `
          <div style="max-width: 620px; margin: 20px auto; border: 1px solid #ccc; padding: 10px 12px; border-radius: 4px; background: #fff;">
            <div style="display: flex; align-items: center;">
              <img src="${row.drive}thumb" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover; margin-right: 5px;">
              <a href=${row.drive} style="font-weight: 500; color: #555">${row.driveTitle}</a>
              <span style="flex: 1"></span>
              <a href=${row.url} style="color: #555">${dateFormatter.format(row.stat.mtime)} <small>${timeFormatter.format(row.stat.mtime)}</small></a>
            </div>
            <div>${row.content}</div>
          </div>
        `
      }
    },
  },
  {
    title: 'Blog posts',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: '/blog/*.md',
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var results = []
      for (let candidate of candidates) {
        let title = candidate.stat.metadata.title || candidate.path.split('/').pop()
        let content = await beaker.hyperdrive.readFile(candidate.url).catch(e => undefined)
        content = removeMarkdown(content || '')
        if (filter) {
          let contentMatch = matchAndSliceString(filter, content)
          if (contentMatch) content = contentMatch
          let titleMatch = matchAndSliceString(filter, title)
          if (titleMatch) title = titleMatch
          if (!contentMatch && !titleMatch) continue
        } else {
          if (content.length > 300) {
            content = content.slice(0, 300) + '...'
          }
        }
        candidate.driveTitle = await getDriveTitle(candidate.drive)
        candidate.title = title
        candidate.content = content
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    },
    views: {
      card (row) {
        return `
          <div style="border: 1px solid #ccc; padding: 14px 16px; background: #fff; border-radius: 4px; margin: 16px auto; max-width: 700px">
            <div><a href=${row.drive} style="color: #777">${row.driveTitle}</a></div>
            <h2 style="margin: 0"><a href=${row.url} style="color: #555">${row.title}</a></h2>
            <div style="margin: 0.6em 0 0">${row.content}</div>
          </div>
        `
      }
    }
  },
  DEBUG_LINKS_QUERY('Modules', 'modules'),
  DEBUG_LINKS_QUERY('Apps', 'apps'),
  {
    title: 'Users',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let candidates = addressBook.profiles.concat(addressBook.contacts)

      var results = []
      for (let candidate of candidates) {
        let {url, title, description} = await beaker.hyperdrive.getInfo(candidate.key)
        if (filter) {
          let titleMatch = matchAndSliceString(filter, title)
          if (titleMatch) title = titleMatch
          let descriptionMatch = matchAndSliceString(filter, description)
          if (descriptionMatch) description = descriptionMatch
          if (!titleMatch && !descriptionMatch) continue
        } else {
          if (description.length > 300) {
            description = description.slice(0, 300) + '...'
          }
        }
        results.push({
          url,
          title,
          description,
          toHTML: () => `
            <img src="${url}thumb" style="float: left; border-radius: 50%; width: 40px; height: 40px; object-fit: cover; margin-right: 10px">
            <h1><a href="${url}">${title}</a></h1>
            <div><q>${description}</q></div>
          `
        })
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    }
  }
]
function DEBUG_LINKS_QUERY (title, id) {
  return {
    title,
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: `/links/${id}/*.goto`,
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var results = []
      var re = filter ? filterToRegex(filter) : undefined
      for (let candidate of candidates) {
        let title = candidate.stat.metadata.title || candidate.path.split('/').pop()
        let description = candidate.stat.metadata.description || ''
        let href = candidate.stat.metadata.href || ''
        let hrefDecorated = href
        if (re) {
          if (!title || !href) continue
          let match = false
          title = title.replace(re, string => {
            match = true
            return `<mark>${string}</mark>`
          })
          description = description.replace(re, string => {
            match = true
            return `<mark>${string}</mark>`
          })
          // hrefDecorated = href.replace(re, string => {
          //   match = true
          //   return `<mark>${string}</mark>`
          // })
          if (!match) continue
        }
        candidate.driveTitle = await getDriveTitle(candidate.drive)
        candidate.href = href
        candidate.title = title
        candidate.description = description
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    },
    views: {
      card (row) {
        return `
          <div style="border: 1px solid #ccc; padding: 14px 16px; background: #fff; border-radius: 4px; margin: 16px auto; max-width: 700px">
            <div>Shared by <a href=${row.drive} style="color: #777">${row.driveTitle}</a></div>
            <h2 style="margin: 5px 0"><a href=${row.url} style="color: #555">${row.title}</a></h2>
            ${row.description ? `<div>${row.description}</div>` : ''}
          </div>
        `
      }
    }
  }
}
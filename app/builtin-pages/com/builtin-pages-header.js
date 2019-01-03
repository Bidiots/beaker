/* globals beaker DatArchive */

import yo from 'yo-yo'
import toggleable, {closeAllToggleables} from './toggleable'
import * as toast from './toast'
import * as contextMenu from './context-menu'
import {writeToClipboard} from '../../lib/fg/event-handlers'

const SITE_TEMPLATES = [
  {id: 'web-page', title: 'Web page'},
  {id: 'file-share', title: 'File share'},
  {id: 'image-collection', title: 'Image collection'},
  {id: 'music-album', title: 'Album', disabled: true},
  {id: 'video', title: 'Video', disabled: true},
  {id: 'podcast', title: 'Podcast', disabled: true},
  {id: 'module', title: 'Code Module', disabled: true},
  {id: 'blank', title: 'Empty project'}
]

// exported api
// =

export default function render (currentPage, currentUserSession) {
  const iconsOnly = false // TODO do we want this? -prf localStorage.builtinPagesHeaderIconsOnlySetting == 1
  const navItem = iconsOnly
    ? (url, icon, label) => yo`<a href="${url}" class="${label === currentPage ? 'active': ''}"><span class="${icon}"></span></a>`
    : (url, icon, label) => yo`<a href="${url}" class="${label === currentPage ? 'active': ''}"><span class="${icon}"></span> ${label}</a>`
  return yo`
    <div class="builtin-header fixed" oncontextmenu=${undefined /* TODO do we want this? -prf e => onContextMenu(e, currentPage, currentUserSession) */}>
      <div class="nav">
        ${navItem('beaker://start', 'fas fa-th', 'Start')}
        ${navItem('beaker://feed', 'fa fa-list-ul', 'Feed')}
        ${navItem('beaker://library', 'far fa-hdd', 'Library')}
        ${navItem('beaker://search', 'fa fa-search', 'Search')}
      </div>
      <div class="flex-spacer"></div>
      <div class="nav">
        ${renderNewButton()}
        ${renderDropdownNav(currentUserSession)}
      </div>
      ${''/* TODO <div class="notifications" data-count="0">
        <span class="fa fa-bell-o"></span>
      </div>*/}
    </div>`
}

// internal methods
// =

function rerender (currentPage, currentUserSession) {
  yo.update(document.querySelector('.builtin-header'), render(currentPage, currentUserSession))
}

function renderHelpButton () {
  return yo`
    <button class="btn plain help" onclick=${onClickHelpButton}>
      <i class="fa fa-question-circle-o"></i>
    </button>`
}

function renderDropdownNav (currentUserSession) {
  if (!currentUserSession) return ''
  return toggleable(yo`
    <div
      class="dropdown toggleable-container builtin-pages-nav"
      data-toggle-id="builtin-pages-nav-menu"
    >
      <a class="toggleable">
        <i class="fa fa-caret-down"></i>
      </a>

      <div class="dropdown-items subtle-shadow right">
        <a href="beaker://bookmarks" class="dropdown-item">
          <i class="far fa-star"></i>
          <span>Bookmarks</span>
        </a>

        <a href="beaker://history" class="dropdown-item">
          <i class="fa fa-history"></i>
          <span>History</span>
        </a>

        <a href="beaker://downloads" class="dropdown-item">
          <i class="fa fa-download"></i>
          <span>Downloads</span>
        </a>

        <a href="beaker://watchlist" class="dropdown-item">
          <i class="fa fa-eye"></i>
          <span>Watchlist</span>
        </a>

        <a href="beaker://settings" class="dropdown-item">
          <i class="fas fa-cog"></i>
          <span>Settings</span>
        </a>

        <a class="dropdown-item" onclick=${onClickTourButton}>
          <i class="fa fa-life-ring"></i>
          <span>Tour</span>
        </a>
      </div>
    </div>
  `)
}

function renderNewButton () {
  return toggleable(yo`
    <div class="dropdown toggleable-container create-new-dropdown">
      <a class="toggleable">
        <span>+ New</span>
      </a>
      <div class="dropdown-items create-new subtle-shadow right">
        ${SITE_TEMPLATES.map(t => yo`
          <div
            class="dropdown-item${t.disabled ? ' disabled' : ''}"
            onclick=${t.disabled ? undefined : e => onClickSiteTemplate(e, t.id)}
          >
            <img src="beaker://assets/img/templates/${t.id}.png" />
            <span>${t.title}</span>
          </div>
        `)}
      </div>
    </div>
  `)
}

function onContextMenu (e, currentPage, currentUserSession) {
  if (!e.target.classList.contains('builtin-header')) {
    // only handle when clicking on the bg of the header
    return
  }
  e.preventDefault()
  e.stopPropagation()

  var x = e.clientX
  var y = e.clientY
  var iconsOnly = localStorage.builtinPagesHeaderIconsOnlySetting == 1

  const setIconsOnly = v => () => {
    localStorage.builtinPagesHeaderIconsOnlySetting = v ? 1 : 0
    rerender(currentPage, currentUserSession)
  }

  // construct and show popup
  let items = [
    {icon: !iconsOnly ? 'fas fa-check' : false, label: 'Icons and labels', click: setIconsOnly(false)},
    {icon: iconsOnly ? 'fas fa-check' : false, label: 'Icons only', click: setIconsOnly(true)}
  ]
  contextMenu.create({x, y, items})
}

async function onClickTourButton () {
  closeAllToggleables()
  beakerStartTutorial()
}

function onCopyLink (url) {
  writeToClipboard(url)
  toast.create('Link copied to clipboard')
}

async function onClickSiteTemplate (e, template) {
  e.preventDefault()
  e.stopPropagation()

  // create the dat
  template = template === 'blank' ? false : template
  var archive = await DatArchive.create({template, prompt: false})
  
  if (!template) {
    // for the blank template, go to the source view
    // TODO should go to the editor
    window.location = `beaker://library/${archive.url}#setup`
  } else {
    // go to the site
    window.location = archive.url
  }
}

async function onCreateSiteFromFolder () {
  // ask user for folder
  const folder = await beaker.browser.showOpenDialog({
    title: 'Select folder',
    buttonLabel: 'Use folder',
    properties: ['openDirectory']
  })
  if (!folder || !folder.length) return

  // create a new archive
  const archive = await DatArchive.create({prompt: false})
  await beaker.archives.setLocalSyncPath(archive.url, folder[0], {previewMode: true})
  window.location = 'beaker://library/' + archive.url + '#setup'
}

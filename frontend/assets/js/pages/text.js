import { sendData, getData } from '../api.js'
import { setNavPath, switchPage } from '../index.js'
import Store from '../store.js'
import { closeMessage, displayMessage } from '../components/message.js'

// global vars
let textId, textEditiorDiv, categories, classActive
const newWords = []

// Initialize text editor area
const init = async (nextTextId) => {
  closeMessage()
  textPage.hidden = false

  if (nextTextId === undefined) {
    textEditiorDiv = document.getElementById('texteditor')

    const url = decodeURI(window.location.pathname)
    const regex = /text\/(.*)$/
    textId = url.match(regex)[1]
  } else {
    textId = nextTextId
    history.pushState(
      null,
      '',
      `/project/${encodeURI(Store.project.name)}/text/${textId}`
    )
    newWords.length = 0
  }
  const result = await sendData(`/texts/${textId}/load`, 'POST', {
    password: Store.password,
  })

  // Place text
  if (result.status) {
    if (Store.project._id === undefined) {
      Store.project._id = result.projectId
    }
    classActive = result.classActive
    document.title = `Labelit - Text: ${result.textName}`
    setNavPath(close, Store.project.name, result.textName)
    textEditiorDiv.innerHTML = result.contentHtml
  } else {
    document.title = `Labelit - Text: ${textId}`
    textEditiorDiv.innerHTML = ''
    setNavPath(close, 'Unknown', result.textId)
    return
  }

  // Create category menu
  categories = result.categories
  document.getElementById('categorymenu').innerHTML = categories.reduce(
    (outputHTML, category) =>
      outputHTML +
      `<div class="categoryButton"><button type="button" class="btn btn-${category.color} btn-sm" onclick="textFuncs.addLabel('${category.key}')">${category.name} <span class="badge badge-light">${category.keyUp}</span><span class="sr-only">key</span></button></div>
    `,
    '<div class="menuHeader">Categories</div>'
  )

  // Create classification menu
  if (classActive) {
    document.getElementById('classificationsmenu').hidden = false
    document.getElementById(
      'classificationsmenu'
    ).innerHTML = result.projectClassifications.reduce(
      (outputHTML, classification) =>
        outputHTML +
        `<div class="custom-control custom-checkbox mb-3">
        <input
          class="custom-control-input"
          name="classifications"
          id="classificationCheckbox${classification.name}"
          value="${classification._id}"
          type="checkbox"
          ${
            result.classifications.includes(classification._id) ? 'checked' : ''
          }
        /><label
          class="custom-control-label "
          for="classificationCheckbox${classification.name}"
          >${classification.name}</label
        >
      </div>`,
      '<div class="menuHeader">Classifications</div>'
    )
  }

  // Set show confirmed
  document.getElementById('showConfirmed').checked = result.showConfirmed

  // Init key event listener
  document.addEventListener('keyup', handleKeyPress)
}

const close = () => {
  Store.textPage.hidden = true
  document.getElementById('classificationsmenu').hidden = true
  document.removeEventListener('keyup', handleKeyPress)
}

// Enables single click word selection
const clickWord = () => {
  const selection = window.getSelection()
  // Prevent error after auto click from removeLabel -> removeAllranges
  if (selection.anchorNode === null) return

  const node = selection.anchorNode
  const range = selection.getRangeAt(0)
  while (range.startOffset >= 0) {
    const firstChar = range.toString().charAt(0)
    if (
      firstChar === ' ' ||
      firstChar === ',' ||
      firstChar === '.' ||
      firstChar === ';' ||
      firstChar === ':' ||
      firstChar === '\n'
    ) {
      range.setStart(node, range.startOffset + 1)
      break
    }
    if (range.startOffset > 0) {
      range.setStart(node, range.startOffset - 1)
    } else {
      break
    }
  }

  while (range.endOffset <= node.length) {
    const lastChar = range.toString().slice(-1)
    if (
      lastChar === ' ' ||
      lastChar === ',' ||
      lastChar === '.' ||
      lastChar === ';' ||
      lastChar === ':' ||
      lastChar === '\n'
    ) {
      range.setEnd(node, range.endOffset - 1)
      break
    }
    if (range.endOffset < node.length) {
      range.setEnd(node, range.endOffset + 1)
    } else {
      break
    }
  }
}

// Necessary to use removeEventListener
const handleKeyPress = (event) => {
  if (event.key === 'Enter') updateText()
  else if (event.key === 'ArrowRight') getNextText()
  else if (event.key === 'ArrowLeft') getNextText(true)
  else addLabel(event.key)
}

// Adds label to selected text
const addLabel = (key) => {
  const label = categories.find((category) => {
    return category.key === key
  })
  if (label === undefined) return
  // Get selected text
  const highlight = window.getSelection()

  // Check if invalid marking area
  if (
    highlight.anchorNode === null ||
    highlight.type === 'Caret' ||
    highlight.anchorNode.parentElement.className !== 'texteditor'
  ) {
    return
  }

  const selected = highlight.toString()

  // Delete text
  const range = window.getSelection().getRangeAt(0)
  range.deleteContents()

  // Create elements for labeled area
  const span = document.createElement('span')
  span.classList.add('labeledarea')
  const spanLabel = span.appendChild(document.createElement('span'))
  spanLabel.classList.add('labeled')
  spanLabel.innerText = label.name
  spanLabel.style = 'background-color:' + label.colorHex
  const spanOriginal = span.appendChild(document.createElement('span'))
  spanOriginal.classList.add('originalWord')
  spanOriginal.hidden = true
  spanOriginal.innerText = selected
  const spanRemove = span.appendChild(document.createElement('span'))
  spanRemove.classList.add('removeInit')

  // Insert created element and remove selection
  range.insertNode(span)
  window.getSelection().removeAllRanges()

  // Replace other occurrences
  const confirmHTML =
    '<span class="labeledarea"><span class="originalWord">' +
    selected +
    '</span><span class="confirmDivider"></span><span class="labeled" style="background-color:' +
    label.colorHex +
    '">' +
    label.name +
    '</span><span class="confirm" onclick="textFuncs.confirmLabel(this)"></span><span class="remove" onclick="textFuncs.removeLabel(this)"></span></span>'
  textEditiorDiv.innerHTML = textEditiorDiv.innerHTML.replace(
    new RegExp('(?![^<]*>)\\b' + selected + '\\b((?!<\\/span))', 'g'),
    confirmHTML
  )
  // Necessary since all previously set eventlisteners are removed during innerHTML.replace
  // No working -> spanRemove.onclick = () => removeLabel(spanRemove)
  textEditiorDiv.innerHTML = textEditiorDiv.innerHTML.replace(
    new RegExp('<span class="removeInit"></span>', 'g'),
    '<span class="remove" onclick="textFuncs.removeLabel(this)"></span>'
  )

  // Add word to wordlist
  newWords.push({
    str: selected,
    category: label._id,
  })
}

const confirmLabel = (element) => {
  const parent = element.parentElement
  const divider = parent.getElementsByClassName('confirmDivider')[0]
  divider.remove()
  element.remove()
  parent.getElementsByClassName('originalWord')[0].hidden = true
  window.getSelection().removeAllRanges()
}

const removeLabel = (element) => {
  const parent = element.parentElement
  const originalWord = parent.getElementsByClassName('originalWord')[0]
    .innerText
  textEditiorDiv.insertBefore(document.createTextNode(originalWord), parent)
  parent.remove()
  textEditiorDiv.normalize()
}

const getNextText = async (prev = false) => {
  const showConfirmed = document.getElementById('showConfirmed').checked
  const result = await getData(
    `/texts/next/${textId}/${Store.project._id}/${showConfirmed}/${prev}`
  )

  if (result.status !== 200) {
    return
  }

  if (result.textId) init(result.textId)
  else switchPage(close, `/project/${encodeURI(Store.project.name)}`)
}

const updateText = async () => {
  if (textEditiorDiv.innerHTML.includes('<span class="confirmDivider">')) {
    displayMessage(false, 'Can not save before all elements are confirmed')
    return
  }

  const classList = document
    .getElementById('classificationsmenu')
    .querySelectorAll('input[type=checkbox]:checked')
  if (classActive && classList.length === 0) {
    displayMessage(
      false,
      'Can not save before at least one classification is selected'
    )
    return
  }

  // Array with selected classifications
  const classArr = []
  for (let i = 0; i < classList.length; i++) {
    classArr.push(classList[i].value)
  }

  const result = await sendData(`/texts/${textId}`, 'PUT', {
    textRaw: textEditiorDiv.innerText,
    htmlText: textEditiorDiv.innerHTML,
    projectId: Store.project._id,
    newWords,
    password: Store.password,
    classifications: classArr,
  })
  if (result.status) {
    displayMessage(true, 'Text saved')
  }
}

const changeShowConfirmed = async (element) => {
  const result = await sendData(`/projects/${Store.project._id}`, 'PUT', {
    showConfirmed: element.checked,
  })

  if (result.status !== 200) {
    return
  }

  Store.project.showConfirmed = element.checked
}

export {
  removeLabel,
  confirmLabel,
  addLabel,
  clickWord,
  init,
  updateText,
  getNextText,
  changeShowConfirmed,
}

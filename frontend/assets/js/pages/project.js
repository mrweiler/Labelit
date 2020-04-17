import { sendData, getData } from '../api.js'
import { switchPage, setNavPath } from '../router.js'
import Store from '../store.js'
import { displayMessage } from '../components/message.js'

const init = async () => {
  Store.projectPage.hidden = false
  const projectName = window.location.pathname.match(/^\/project\/(.{1,})$/)[1]

  const result = await getData(`/projects/${projectName}`)
  if (result.status !== true) {
    document.title = `Labelit - Project`
    setNavPath(close, projectName)
    displayMessage(result.status, 'Project could not be loaded')
    return
  }
  Store.project = result.project
  document.title = `Labelit - Project: ${Store.project.name}`

  setNavPath(close, Store.project.name)

  document.getElementById('projectDescription').innerText =
    Store.project.description
  document.getElementById(
    'projectProgress'
  ).innerHTML = ` <div class="progress-percentage"><span>${Store.project.progress}%</span></div>
  <div class="progress">
    <div class="progress-bar" style="width: ${Store.project.progress}%;" role="progressbar" aria-valuenow="${Store.project.progress}" aria-valuemin="0" aria-valuemax="100"></div>
  </div>`

  let categoryMenuHTML = 'No categories'
  if (Store.project.categories.length > 0) {
    categoryMenuHTML = Store.project.categories.reduce(
      (outputHTML, category) =>
        outputHTML +
        `<button type="button" class="btn btn-${category.color} btn-sm" onclick="projectFuncs.showEditCategory('${category._id}', this)">${category.name} <span class="badge badge-light">${category.keyUp}</span><span class="sr-only">key</span>
    </button><span class="remove middle" onclick="projectFuncs.removeCategory('${category._id}')" hidden></span>
    `,
      ''
    )
  }
  document.getElementById('projectCategories').innerHTML = categoryMenuHTML

  document.getElementById('texts').innerHTML = Store.project.texts.reduce(
    (outputHTML, text) => {
      let status = ''
      if (text.status === 'confirmed')
        status = '<span class="confirmed"></span>'
      else if (text.status === 'unconfirmed')
        status = '<span class="unconfirmed"></span>'
      return (
        outputHTML +
        `<div><span class="link" onclick="projectFuncs.openText('${text._id}')">${text.name}</span>${status}</div>
    `
      )
    },
    ''
  )
}

const close = () => {
  Store.projectPage.hidden = true
}

const openText = (textId) => {
  switchPage(close, `/project/${encodeURI(Store.project.name)}/text/${textId}`)
}

const updateProject = async () => {
  const newProjectName = document.getElementById('projectNameInput').value

  const result = await sendData(`/projects/${Store.project._id}`, 'PUT', {
    name: newProjectName,
    description: document.getElementById('projectDescriptionInput').value,
  })
  if (result.status === true) {
    document.getElementById('projectForm').hidden = true
    history.pushState(null, '', `/projects/${newProjectName}`)
    init()
    displayMessage(result.status, 'Project successfully updated')
  } else {
    displayMessage(result.status, 'Project could not be updated')
  }
}

const removeProject = async () => {
  const confirmed = confirm(
    `Do you realy want to delete the project ${Store.project.name}? This can not be reversed! `
  )
  if (!confirmed) return
  const result = await sendData(`/projects/${Store.project._id}`, 'DELETE')
  if (result.status === true) {
    window.location.pathname = '/projects'
  } else {
    displayMessage(result.status, 'Could not remove project')
  }
}

const showNewCategory = () => {
  Array.from(document.getElementsByClassName('remove')).forEach((element) => {
    element.hidden = true
  })
  const current = document.getElementById('categoryForm').hidden
  if (current === false) {
    const button = document.getElementById('submitCategory')
    if (button.innerText === 'Update') {
      button.innerText = 'Add'
      document.getElementById('categoryName').value = ''
      document.getElementById('categoryKey').value = ''
      document.getElementById('categoryColor').value = ''
      button.onclick = () => projectFuncs.addCategory()
      return
    }
  }
  document.getElementById('categoryForm').hidden = !current
}

const addCategory = async () => {
  const categoryNameEl = document.getElementById('categoryName')
  const categoryKeyEl = document.getElementById('categoryKey')
  const categoryColorEl = document.getElementById('categoryColor')
  const colorArr = categoryColorEl.value.split(',')

  const result = await sendData(
    `/projects/${Store.project._id}/categories`,
    'POST',
    {
      name: categoryNameEl.value,
      key: categoryKeyEl.value,
      color: colorArr[0],
      colorHex: colorArr[1],
    }
  )
  if (result.status === true) {
    categoryNameEl.value = ''
    categoryKeyEl.value = ''
    categoryColorEl.value = ''
    init()
    displayMessage(result.status, 'Category successfully added')
  } else {
    displayMessage(result.status, 'Could not add category')
  }
}

const showEditCategory = async (categoryId, node) => {
  Array.from(document.getElementsByClassName('remove')).forEach((element) => {
    element.hidden = true
  })
  node.nextSibling.hidden = false
  document.getElementById('categoryForm').hidden = false
  const category = Store.project.categories.find(
    (category) => category._id === categoryId
  )
  const button = document.getElementById('submitCategory')
  document.getElementById('categoryName').value = category.name
  document.getElementById('categoryKey').value = category.key
  document.getElementById('categoryColor').value =
    category.color + ',' + category.colorHex
  button.innerText = 'Update'
  button.onclick = () => projectFuncs.updateCategory(categoryId)
}

const updateCategory = async (categoryId) => {
  const categoryNameEl = document.getElementById('categoryName')
  const categoryKeyEl = document.getElementById('categoryKey')
  const categoryColorEl = document.getElementById('categoryColor')
  const colorArr = categoryColorEl.value.split(',')

  const result = await sendData(
    `/projects/${Store.project._id}/categories/${categoryId}`,
    'PUT',
    {
      name: categoryNameEl.value,
      key: categoryKeyEl.value,
      color: colorArr[0],
      colorHex: colorArr[1],
    }
  )
  if (result.status === true) {
    init()
    categoryNameEl.value = ''
    categoryKeyEl.value = ''
    categoryColorEl.value = ''
    const button = document.getElementById('submitCategory')
    button.innerText = 'Add'
    button.onclick = projectFuncs.addCategory
    displayMessage(result.status, 'Category successfully updated')
  } else {
    displayMessage(result.status, 'Could not update category')
  }
}

const removeCategory = async (categoryId) => {
  const result = await sendData(
    `/projects/${Store.project._id}/categories/${categoryId}`,
    'DELETE'
  )
  if (result.status === true) {
    init()
    displayMessage(result.status, 'Category successfully removed')
  } else {
    displayMessage(result.status, 'Could not remove Category')
  }
}

const checkTexts = async () => {
  const result = await sendData(`/texts/check`, 'POST', {
    projectId: Store.project._id,
    password: Store.password,
  })

  if (result.status === true) {
    init()
    displayMessage(result.status, 'All texts checked')
  } else {
    displayMessage(result.status, 'Could not check texts')
  }
}

const exportTexts = async () => {
  const folderPath = document.getElementById('exportPath').value
  if (folderPath === '') {
    displayMessage(false, 'Export path can not be empty')
  }
  const result = await sendData(`/texts/export`, 'POST', {
    projectId: Store.project._id,
    projectName: Store.project.name,
    folderPath,
    password: Store.password,
  })

  if (result.status === true) {
    if (result.valid === false) {
      displayMessage(false, 'Invalid project password')
      return
    }
    displayMessage(result.status, 'Text files successfully exported')
  } else {
    displayMessage(result.status, 'Could not export text files')
  }
}

const showProjectForm = () => {
  document.getElementById('projectNameInput').value = Store.project.name
  document.getElementById('projectDescriptionInput').value =
    Store.project.description
  document.getElementById('projectForm').hidden = !document.getElementById(
    'projectForm'
  ).hidden
}

export {
  init,
  updateProject,
  removeProject,
  addCategory,
  showEditCategory,
  updateCategory,
  removeCategory,
  exportTexts,
  checkTexts,
  showNewCategory,
  showProjectForm,
  openText,
}
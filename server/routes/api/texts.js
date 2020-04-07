const express = require('express')
const router = express.Router()
const textsService = require('../../services/texts')

// Load
router.post('/:textId/load', async (req, res) => {
  try {
    const data = await textsService.load(req.params.textId, req.body.password)
    res.json({
      status: true,
      ...data,
    })
  } catch (error) {
    res.json({ status: false })
  }
})

// Update text
router.put('/', async (req, res) => {
  try {
    const result = await textsService.update(
      req.body.textRaw,
      req.body.htmlText,
      req.body.textId,
      req.body.projectId,
      req.body.user,
      req.body.newWords,
      req.body.password
    )
    res.json({
      status: true,
      nextTextId: result.nextTextId,
      nextTextName: result.nextTextName,
    })
  } catch (error) {
    res.json({ status: false })
  }
})

// Export Texts
router.post('/export', async (req, res) => {
  try {
    const result = await textsService.exportTexts(
      req.body.projectId,
      req.body.projectName,
      req.body.folderPath,
      req.body.password
    )
    res.json({ status: true, valid: result })
  } catch (error) {
    console.log(error)
    res.json({ status: false })
  }
})

module.exports = router

const express = require('express');
const Document = require('../models/Document');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Create a new document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               lastModifiedBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req, res) => {
    try {
        const { content, lastModifiedBy } = req.body;
        const newDocument = new Document({ content, lastModifiedBy });
        await newDocument.save();
        res.status(201).json(newDocument);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const documents = await Document.find();
        res.status(200).json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: Get a single document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document retrieved successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(200).json(document);
    } catch (error) {
        res.status500().json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   put:
 *     summary: Update a document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               lastModifiedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req, res) => {
  try {
      const { content, lastModifiedBy } = req.body;
      const document = await Document.findById(req.params.id);
      if (!document) {
          return res.status(404).json({ message: 'Document not found' });
      }
      document.content = content;
      document.lastModifiedBy = lastModifiedBy;
      document.version += 1;
      await document.save();
      res.status(200).json(document);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Delete a document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

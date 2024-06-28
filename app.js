const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb://localhost:27017/GridFs';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Init gfs
let gfs;

conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = file.originalname;
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage: storage });

// @route GET /
// @desc Home Page
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (err || !files || files.length === 0) {
            res.render("index", { files: false })
        }
        //  else {
        //     files.map(file => res.render('index', { files: files, type: file.contentType }))
        // }
        res.render("index", { files: files })
    })
});

// @route POST /upload
// @desc upload files to mongodb
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // res.json({ file: req.file });
    res.redirect('/')
});

// @route GET /files
// @desc Display all the files
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving files' });
        }
        res.json(files);
    });
});

// @route GET /files/filename
// @desc Display single file
app.get("/files/:filename", (req, res) => {
    const filename = req.params.filename;
    gfs.files.findOne({ filename }, (err, file) => {
        if (err || !file || file.length === 0) {
            return res.status(404).json({ error: "File not found" })
        }
        // return res.json(file)
        gfs.createReadStream(file.filename).pipe(res);
    })
})

// @route DELETE /files/id
// @desc Delete single file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err
        , file) => {
        if (err) {
            return res.status(500).json({ error: err });
        }
        res.redirect("/");
    });
});

app.listen(5000, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Application live on localhost 5000`);
});
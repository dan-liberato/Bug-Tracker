const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser')
const { promisify } = require('util')
const sgMail = require('@sendgrid/mail')

// Google Drive
const GoogleSpreadsheet = require('google-spreadsheet')
const credentials = require('./bugtracker.json')

// Configs
const docID = 'GOOGLE_SHEETS_ID'
const worksheetIndex = 0
const sendGridKey = 'SENDGRID_KEY'

app.set('view engine', 'ejs')
app.set('views', path.resolve(__dirname, 'views'))

app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(__dirname + '/'))

app.get('/', (  request, response   ) => {
    response.render('home')
})

app.post('/', async(request, response) => {
    try {
        const doc = new GoogleSpreadsheet( docID )
        await promisify(doc.useServiceAccountAuth)( credentials)
        const info = await promisify(doc.getInfo)()
        const worksheet = info.worksheets[worksheetIndex]
        await promisify(worksheet.addRow)({
            Name: request.body.name,
            Email: request.body.email,
            issueType: request.body.issueType,
            source: request.query.source || 'direct',
            howToReproduce: request.body.howToReproduce,
            expectedOutput: request.body.expectedOutput,
            receivedOutput: request.body.receivedOutput,
            userDate: request.body.userDate,
            userAgent: request.body.userAgent
        })

        // is critical
        if( request.body.issueType === 'CRITICAL') {
            sgMail.setApiKey(sendGridKey)
            const msg = {
                to: 'danielrcliberato@gmail.com',
                from: 'danielrcliberato@gmail.com',
                subject: 'Bug crítico reportado',
                text: `O usuário ${request.body.name} reportou um problema.`,
                html: `<strong>O usuário ${request.body.name} reportou um problema</strong>`,
            }
            await sgMail.send(msg)
        }

        response.render('success')
    } catch (err) {
        response.send('Erro ao enviar fomulário.')
        console.log(err)
    }
})

app.listen(3000, (err) => {
    if(err) {
        console.log('Aconteceu um erro', err)
    } else {
        console.log('BugTracker rodando na porta http://localhost:3000')
    }
})

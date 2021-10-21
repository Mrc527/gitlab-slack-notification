const express = require('express')
const process = require('process')
const request = require('request')
const {exit} = require("process")
const app = express()
app.use(express.json())

let debug = false

const argv = key => {
    if(process.env[key]) return process.env[key.toUpperCase()]
    if (process.argv.includes(`--${key}`)) return true
    const value = process.argv.find(element => element.startsWith(`--${key}=`))
    if (!value) return null
    return value.replace(`--${key}=`, '')
}

if (!argv("HOOK") && !process.env.HOOK) {
    console.log("Usage: node sever.js --HOOK AAAA/BBBB/CCC [-v]")
    exit(1)
}

if (argv("v") || process.env.V) {
    debug = true
}
if(debug)
{
    console.log(`Using Slack Hook: https://hooks.slack.com/services/${argv("HOOK")}`)
}

app.post('/', function (req, res) {
    if (debug) {
        console.log('*****BEGIN*****')
        console.log(req.body)
        console.log('*****END*****')
    }

    if (req.body?.commit?.message) {
        if(debug) {
            console.log("Commit:\n")
            const result = req.body.commit.message.split`\n`.filter((l, i) => i > 1).join`\n`
            console.log(result)
        }
    }

    if (req.body?.object_kind === 'merge_request') {
        if (debug) {
            console.log("Got Merge Request hook:\n")
            console.log("Title:" + req.body?.object_attributes.title)
            console.log("Description:" + req.body?.object_attributes.description)
            console.log("State:" + req.body?.object_attributes.state)
            console.log("State_ID:" + req.body?.object_attributes.state_id)
            console.log("Source:" + req.body?.object_attributes.source_branch)
            console.log("Target:" + req.body?.object_attributes.target_branch)
        }

        if (req.body?.object_attributes.state === 'merged' && req.body?.object_attributes.target_branch === 'master') {
            const result = `*NEW UPDATE*\nService *${req.body?.project?.name}* has been updated!\n\n${req.body?.object_attributes.title}\n\n${req.body?.object_attributes.description}`

            request.post(
                {
                    url: `https://hooks.slack.com/services/${argv("HOOK")}`,
                    json: {
                        text: result,
                        blocks:
                            [
                                {
                                    "type": "header",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "NEW UPDATE",
                                        "emoji": true
                                    }
                                },
                                {
                                    "type": "section",
                                    "fields": [
                                        {
                                            "type": "mrkdwn",
                                            "text": `*Service:*\n${req.body?.project?.name}`
                                        },
                                        {
                                            "type": "mrkdwn",
                                            "text": `*Created by:*\n${req.body?.user?.name}`
                                        }
                                    ]
                                },
                                {
                                    "type": "divider"
                                },
                                {
                                    "type": "section",
                                    "text": {
                                        "type": "mrkdwn",
                                        "text": `*${req.body?.object_attributes.title}:*\n${req.body?.object_attributes.description}`
                                    }
                                }
                            ]
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                },
                function (error, response, body) {
                    if(debug) {
                        console.log("Response from Slack:" + JSON.stringify(response) + " --> " + JSON.stringify(body))
                    }
                })
        }
    }

    if (debug) {
        console.log("\n\n\n\n")
    }
    res.end('OK')
})

const server = app.listen(8081, function () {
    const host = server.address().address;
    const port = server.address().port;
    console.log("Listening for hooks at http://%s:%s", host, port)
});

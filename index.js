const express = require('express')
const cors = require('cors')
const { google } = require("googleapis")

const app = express();
app.use(cors())

app.get("/api", async (req, res) => {

    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json", 
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    })
    // Create client instance for auth
    const client = await auth.getClient();

    // Instance of Google Sheets API

    const googleSheets = google.sheets({ version: "v4", auth: client })
   
    const spreadsheetId = "1DeqFo6-v4RdJ6j7Gf5pSqil6CG14lUqlyqAtB7dtHxI"; // main sheet

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B2"
    })
    
    const spreadsheetIdForUser = await getUserURL.data.values[0][0]

    const businessDetalsSheetKeys = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "BusinessDetails!A1:1"
    })

    const businessDetailsData = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "BusinessDetails!A2:2"
    })

    const keys = await businessDetalsSheetKeys.data.values[0]
    const values = await businessDetailsData.data.values[0]

    const obj = await {};
    await keys.forEach((key, index) => {
       obj[key] = values[index];
    });


    console.log(businessDetalsSheetKeys.data.values[0])
    console.log(businessDetailsData.data.values[0])
    // console.log(businessDetails)
    // console.log(businessDetails)
    res.json([obj])
})

app.listen(3001, () => console.log("running on 3000"))
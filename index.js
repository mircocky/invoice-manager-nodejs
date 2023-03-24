const express = require('express')
const cors = require('cors')
const { google } = require("googleapis")
const bodyParser = require('body-parser'); // automatic parsing

const app = express();
app.use(bodyParser.json());
app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}))


const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json", 
    scopes: "https://www.googleapis.com/auth/spreadsheets"
})
// Create client instance for auth

const client = auth.getClient();

// Instance of Google Sheets API

const googleSheets = google.sheets({ version: "v4", auth: client })

const spreadsheetId = "1DeqFo6-v4RdJ6j7Gf5pSqil6CG14lUqlyqAtB7dtHxI"; // main sheet


app.get("/loadBusinessDetails", async (req, res) => {

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B2" // please change dynamically 
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

app.post("/loadDataOfInvoices", async (req, res) => {

    const { currentStatus, todayISO } = await req.body;

    console.log(currentStatus)
    console.log(todayISO)
 
    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B2" // please change dynamically 
    })
    
    const spreadsheetIdForUser = await getUserURL.data.values[0][0]

    const invoicesDataKeys = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "Invoices!A1:1"
    })

    const invoicesData = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "Invoices!A2:J",
    })

    const keys = await invoicesDataKeys.data.values[0]
    const values = await invoicesData.data.values


    if (currentStatus == "Paid") {
     var filteredData = await values.filter(row => row[9].includes('Paid'));
    } else if (currentStatus == "Unpaid") {
     var filteredData = await values.filter(row => row[9].includes('Unpaid'));
    } else if (currentStatus === "All") {
      var filteredData = await invoicesData.data.values
    } else if (currentStatus === "Late") {
        var filteredData = await values.filter(row => row[8] < todayISO )
    }
    
    console.log(filteredData)

    let obj = await [];
    for (let i = 0; i < filteredData.length; i++) {
      obj[i] = await keys.reduce((accumulator, element, index) => {
        return { ...accumulator, [element]: filteredData[i][index] };
      }, {});
    }

    // const obj = await {};
    // for (let i = 0; i < values.length; i++) {
    //     for (let j = 0; j < keys.length; j++) {
    //       obj[keys[j]] = values[i][j];
    //     }
    //   }
    // for (let i = 0; i < values.length; i++) {
    // await keys.forEach( async (key, index) => {
    //     obj[key]= await values[i][index];
    //    })
    // }

//     for (let i = 0; i < values.length; i++) {
//     await keys.forEach((key, index) => {
//      obj[i][key]= values[i][index]; 
//     })
//    }

    // console.log(invoicesData.data.values)
    // console.log(values.length)
    // console.log(obj)
    
    // console.log(businessDetails)
    // console.log(businessDetails)
    res.json([obj])
})



app.post("/newInvoice", async (req, res) => {

    const { billtoEmail, billtoName, billtoFullAddress,billtoContactNumber,billtoItems,billingTotals,issueDate,dueDate,currentStatus } = req.body;
    
    // const obj = [{userName:name}]

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B2"
    })
    
    const spreadsheetIdForUser = await getUserURL.data.values[0][0]


    const getArrayOfInvoiceNums = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        majorDimension: "COLUMNS", // --> set values into an arry(all data in one array) from data and read
        // majorDimension: "ROWS", // --> set values into arrays(one row one array) from data and read
        range: "Invoices!A1:A", // --> from A2 to the lastRow
        // range: "Bookings!A2:2", // --> from A2 to the lastColumn
      })
    
    const prevInvoiceNum = await getArrayOfInvoiceNums.data.values[0][getArrayOfInvoiceNums.data.values[0].length - 1]

    if (!isNaN(parseFloat(prevInvoiceNum)) && isFinite(prevInvoiceNum) && prevInvoiceNum >= 10000) {
        var invoiceNum = await new Number(prevInvoiceNum) + 1
        } else {
        var invoiceNum = await new Number(10000)
    }

    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "Invoices!A:Z",
        valueInputOption: "USER_ENTERED",
        resource:{
          values:[[invoiceNum,billtoEmail, billtoName, billtoFullAddress,String("'"+billtoContactNumber),billtoItems,billingTotals,"'"+issueDate,"'"+dueDate,currentStatus]]
        }
    })

    // const businessDetailsData = await googleSheets.spreadsheets.values.get({
    //     auth,
    //     spreadsheetId: spreadsheetIdForUser,
    //     range: "BusinessDetails!A2:2"
    // })

    // const keys = await businessDetalsSheetKeys.data.values[0]
    // const values = await businessDetailsData.data.values[0]

    // const obj = await {};
    // await keys.forEach((key, index) => {
    //    obj[key] = values[index];
    // });

    // console.log(name)
    // console.log(businessDetalsSheetKeys.data.values[0])
    // console.log(businessDetailsData.data.values[0])
    // console.log(businessDetails)
    // console.log(businessDetails)
    // res.json([obj])
    // console.log(req.body)
     res.json({invoiceNum })
})

app.post("/saveSettings", async (req, res) => {

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B2" // please change dynamically - User Google Sheet

    })
    
    const spreadsheetIdForUser = await getUserURL.data.values[0][0]

     await googleSheets.spreadsheets.values.update({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "BusinessDetails!H2",
        valueInputOption: "USER_ENTERED",
        resource:{
          values:[[JSON.stringify(req.body.preEnteredItems)]]
        }
    })

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


 res.json([obj])
})




app.listen(3001, () => console.log("running on 3001"))
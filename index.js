const express = require('express')
const cors = require('cors')
const { google } = require("googleapis")
const bodyParser = require('body-parser'); // automatic parsing
const nodemailer = require('nodemailer')
const multer = require('multer');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}))
app.use(fileUpload());

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json", 
    scopes: "https://www.googleapis.com/auth/spreadsheets"
})
// Create client instance for auth

const client = auth.getClient();

// Instance of Google Sheets API

const googleSheets = google.sheets({ version: "v4", auth: client })
const spreadsheetId = "1DeqFo6-v4RdJ6j7Gf5pSqil6CG14lUqlyqAtB7dtHxI"; // main sheet


app.post("/loadBusinessDetails", async (req, res) => {
    
    const email = await req.body.email.toLowerCase() 

    // const email = await 'hhdesigntiling@gmail.com'

    const userNames = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!A2:B" // please change dynamically 
    })

    const rowIndex = await userNames.data.values.findIndex(row => row[0].toLowerCase()=== email)


   if(rowIndex===-1) {
    res.json({validity:"invalid"})
    return;    
    }

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B"+String((new Number(rowIndex)+2)) // please change dynamically 
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

    res.json([obj])
})

app.post("/loadDataOfInvoices", async (req, res) => {

    const { userEmail, currentStatus, todayISO, periodSelected } = await req.body;

 
    const email = await userEmail.toLowerCase() 

    // const email = await 'hhdesigntiling@gmail.com'

    const userNames = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!A2:B" // please change dynamically 
    })

    const rowIndex = await userNames.data.values.findIndex(row => row[0].toLowerCase()=== email)


   if(rowIndex===-1) {
    res.json({validity:"invalid"})
    return;    
    }

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B"+String((new Number(rowIndex)+2)) // please change dynamically 
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
    const values = await invoicesData.data.values.filter((row => {return row[7] >= periodSelected.encodedStartDate && row[7] <= periodSelected.encodedEndDate}))
    
    console.log(values)

    if (currentStatus == "Paid") {
     var filteredData = await values.filter(row => row[9].includes('Paid'));
    } else if (currentStatus == "Unpaid") {
     var filteredData = await values.filter(row => row[9].includes('Unpaid'));
    } else if (currentStatus === "All") {
      var filteredData = await values
    } else if (currentStatus === "Late") {
        var filteredData = await values.filter(row => row[8] < todayISO )
    }


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

    const { userEmail, billtoEmail, billtoName, billtoFullAddress,billtoContactNumber,billtoItems,billingTotals,issueDate,dueDate,currentStatus } = req.body;
    
    // const obj = [{userName:name}]

    const email = await userEmail.toLowerCase() 

    // const email = await 'hhdesigntiling@gmail.com'

    const userNames = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!A2:B" // please change dynamically 
    })

    const rowIndex = await userNames.data.values.findIndex(row => row[0].toLowerCase()=== email)


   if(rowIndex===-1) {
    res.json({validity:"invalid"})
    return;    
    }

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B"+String((new Number(rowIndex)+2)) // please change dynamically 
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


    const { userEmail } = req.body;

    const email = await userEmail.toLowerCase() 

    // const email = await 'hhdesigntiling@gmail.com'

    const userNames = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!A2:B" // please change dynamically 
    })

    const rowIndex = await userNames.data.values.findIndex(row => row[0].toLowerCase()=== email)


   if(rowIndex===-1) {
    res.json({validity:"invalid"})
    return;    
    }

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B"+String((new Number(rowIndex)+2)) // please change dynamically 
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

app.post("/confirmPayment", async (req, res) => {

    console.log(req.body)

    const { userEmail, selected, currentStatus, periodSelected } = await req.body;



    const email = await userEmail.toLowerCase() 

    // const email = await 'hhdesigntiling@gmail.com'

    const userNames = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!A2:B" // please change dynamically 
    })

    const rowIndex = await userNames.data.values.findIndex(row => row[0].toLowerCase()=== email)


   if(rowIndex===-1) {
    res.json({validity:"invalid"})
    return;    
    }

    const getUserURL = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Users!B"+String((new Number(rowIndex)+2)) // please change dynamically 
    })

    const spreadsheetIdForUser = await getUserURL.data.values[0][0]

        const invoicesData = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "Invoices!A2:J",
    })


    selected.map( async element => { 
        const rowIndex = await invoicesData.data.values.findIndex(row => row[0]=== element )

        console.log(rowIndex)
        await googleSheets.spreadsheets.values.update({
           auth,
           spreadsheetId: spreadsheetIdForUser,
           range: "Invoices!J" + new Number(rowIndex+ 2) ,
           valueInputOption: "USER_ENTERED",
           resource:{
           //   values:[[JSON.stringify(req.body)]]
             values:[['Paid']]
           }
       })

    })
 
    const invoicesDataKeys = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "Invoices!A1:1"
    })

    const invoicesDataAfter = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetIdForUser,
        range: "Invoices!A2:J",
    })

    const keys = await invoicesDataKeys.data.values[0]
    const values = await invoicesDataAfter.data.values.filter((row => {return row[7] >= periodSelected.encodedStartDate && row[7] <= periodSelected.encodedEndDate}))
    var filteredData = await values.filter(row => row[9].includes(currentStatus))

console.log(filteredData)

    let obj = await [];
    for (let i = 0; i < filteredData.length; i++) {
      obj[i] = await keys.reduce((accumulator, element, index) => {
        return { ...accumulator, [element]: filteredData[i][index] };
      }, {});
    }

    res.json([obj])
})

app.post('/sendEmail',  async (req, res) => {

    const pdfFile = await req.files.file.data;
    const invoiceData = await JSON.parse(req.body.data)
    const businessDetails = await invoiceData.businessDetails[0]
    const invoiceDetails = await invoiceData.invoiceDetails
    const selected = await invoiceData.selected

let maileTransporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:"stevekim0315@gmail.com",
        pass:"bpsyjlazrtvjoiib"
    }
})

let details ={
    from:"stevekim0315@gmail.com",
    to:"stevekim0315@gmail.com",
    subject:`Reminder - Payment for Invoice #${invoiceDetails.invoiceNum} is Overdue`,
    html:`
    <div style="font-size: 12px; color: black;">
    <pre>
   <span style="color: blue;"> Dear ${invoiceDetails.billtoName} </span>,
  
      I hope this email finds you well. 
  
      I am writing to remind you that the payment for invoice #${invoiceDetails.invoiceNum} is now overdue.
  
      As a valued customer, we greatly appreciate your business and would like to continue providing you with our services. 
  
      However, as we have not received payment for the aforementioned invoice, we kindly request that you settle your account as soon as possible.
  
      Please find attached a copy of the invoice for your reference.
  
      If you have any questions or concerns regarding this matter, please do not hesitate to contact us.
  
      Thank you for your attention to this matter.
  
      Best regards,
  
<span style="font-size: 16px; color: blue;"> ${businessDetails.businessName} </span>
    <span style="color: blue;"> ${businessDetails.businessEmail} </span>
    <span style="color: blue;"> ${businessDetails.businessContactNumber} </span>
    </pre>
  </div>
    `,
    attachments: [
        {   // utf-8 string as an attachment
            filename: "Invoice #"+businessDetails.invoiceNum +".pdf",
            content: pdfFile,
            contentType: 'application/pdf'
        },
    ]
}

maileTransporter.sendMail(details,(err)=>{
    if(err){
        console.log("errors",err)
    } 
    else{
        console.log("just sent")
        res.json({result:"success"})
    }

})

})

app.listen(3002, () => console.log("running on 3002"))
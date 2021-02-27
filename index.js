const express= require("express");

const path = require('path');
const app=express();
const bodyParser = require('body-parser')
require("dotenv").config();
const mysql      = require('mysql');
const connection = mysql.createConnection({
  host     : process.env.host,
  user     : process.env.user,
  port     :  3306,
  password : process.env.password,
  database : process.env.db
});

const plan=[
    {plan_id:'FREE',Validity:'Infinite',Cost:'0.0'},
    {plan_id:'TRIAL',Validity:'7',Cost:'0.0'},
    {plan_id:'LITE_1M',Validity:'30',Cost:'100.0'},
    {plan_id:'PRO_1M',Validity:'30',Cost:'200.0'},
    {plan_id:'LITE_6M',Validity:'180',Cost:'500.0'},
    {plan_id:'PRO_6M',Validity:'180',Cost:'900.0'},
    
]

var PORT = process.env.PORT || 3010;
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ 
  extended: true
})); 

app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, DELETE, OPTIONS,PUT'
    );
    next();
  });


  const date_modify=function(d){    //fuction to modify the datetime value passed from sql database 
    var month='' + (d.getMonth() + 1)
    var day='' + d.getDay();
    var year=d.getFullYear();
    if(month.length<2) month='0'+month;
    if(day.length<2) day = '0'+month;
   
    return [year,month,day].join('-');
  }

  /*
  DATABASE DESIGN DETAILS:
  There is a user_data table which keeps track of all the users alog with their created date and a unique id.
  Created date is auto generated based o insertio of a new row into the table.

  One table is for plan_data which is mapped with the user_data table with user_name. 
  The plan_data consists of all the users subscribed to a particular plan along with their start date and end date.
  */
  /*
  API to put the username into mysql table user_data
  */
  app.put('/user/:name',function(req,res){  

    var user_name=req.params.name;

    connection.query("Insert into user_data(user_name) VALUES('"+user_name+"')",function(err,result,fields){
        if(err) throw err;
        else{
            if(result.affectedRows!=0){
                res.status(200);
            }
            else{
              res.status(400);
            }
        }
    })
  });

   /*
  API to get the username and the user creation date from the table user_data
  */
  app.get('/user/:name',function(req,res){
    var user_name=req.params.name;

    connection.query("SELECT CREATED_AT FROM USER_DATA user_name='"+user_name+"'",function(err,result,fields){
        if(err) throw err;
        else{
            var newdate=new Date(result[0].split('-')[0],result[0].split('-')[1],result[0].split('-')[2]);
            newdate=new Date(newdate+Validity*24*60*60*1000);
           res.send({"user_name":user_name,"created_at":newdate});
        }
    })
  });

  /*
  API to insert the plan details mapped for a particular user in the user_plan table.
  */
  app.post('/subscription',function(req,res){
      var user=req.body.user_name;
      var plan_id=req.body.plan_id;
      var start_date=req.body.start_date;
      var amount;
      plan.forEach( (x) => {
          if(x.plan_id==plan_id){
              var Validity=x.Validity;
              var newdate=new Date(req.body.start_date.split('-')[0],req.body.start_date.split('-')[1],req.body.start_date.split('-')[2]);
              var end_date=new Date(newdate+Validity*24*60*60*1000);
              var month='' + (end_date.getMonth() + 1)
              var day='' + end_date.getDay();
              var year=end_date.getFullYear();
              if(month.length<2) month='0'+month;
              if(day.length<2) day = '0'+month;
              end_date=[year,month,day].join('-');
              amount=x.Cost;
          }
      })

      connection.query("Insert into user_plan(user_name,plan_id,start_date,end_date) VALUES('"+user+"','"+plan_id+"','"+start_date+"','"+end_date+"')",function(err,result,fields){
          if(err) throw err;
          else{
              if(result.affectedRows!=0){
                  res.send({"status":'SUCCESS',"amount":amount})
              }
              else{
                res.send({"status":'FAILED ',"amount":amount})
              }
          }
      })
  })

   /*
  API to get plan details mapped for a particular user in the user_plan table.
  */
  app.get('/subscription/:user/:date',function(req,res){

    var user_name=req.params.user;
    var date=req.params.date;
    if(date!='undefined'){
        date=new Date(date);
        connection.query("SELECT plan_id,end_date from user_plan where user_name='"+user_name+"' && end_date>'"+date+"'",function(err,result,fields){
            if(err) throw err;
            else{
                let y=JSON.parse(JSON.stringify(result));
                const diffTime = Math.abs(y[0].end_date - date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                res.send({"plan_id":y[0].plan_id,"days_left":diffDays});          
            }
        })
    }
    else{
        connection.query("SELECT plan_id,start_date,end_date from user_plan where user_name='"+user_name+"'",function(err,result,fields){
            if(err) throw err;
            else{
                let y=JSON.parse(JSON.stringify(result));
                let data=[];
                y.forEach(el => {
                    var sdate=date_modify(el.start_date);
                    var edate=date_modify(el.end_date);
                    data.push({"plan_id":el.plan_id,"start_date":sdate,"valid_till":edate})
                  })
                  res.send(data);
            }
        })
    }
  })

  app.listen(PORT, () => {
    console.log(`app listening at http://localhost:${PORT}`)
  })
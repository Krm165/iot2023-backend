const express = require("express");
const app = express();

const mysql = require("mysql2");
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const connection = mysql.createConnection(process.env.DATABASE_URL);
// Middleware
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("IOT2023 WATERLEVEL");
});
// Get the latest data from the "senser" table
app.get("/data", (req, res) => {
  console.log("get/data");
  const data = req.body; // Add this line to define the 'data' variable
  // if(pump === "off" && mode === "auto"){
  const sql = "SELECT * FROM senser ORDER BY id DESC LIMIT 1";
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      res.json({ status: "Error", message: err });
      return;
    }
    res.json({ status: "Success", data: results[0] });
    // console.log(results);
  });
});
/* add data from MCU node?station */
app.post("/data", (req, res) => {
  console.log("post/data");
  const data = req.body;
  console.log("post/data");
  console.log("Received data from client: data", data);
  if (data.level === undefined || data.level === null) {
    const errorMessage = {
      status: "Error",
      message: "Level value is required",
    };
    return res.status(400).json(errorMessage);
  }
  if (
    data.temp === undefined ||
    data.temp === null ||
    data.humi === undefined ||
    data.humi === null
  ) {
    const errorMessage = {
      status: "Error",
      message: "Temp and Humi values are required",
    };
    return res.status(400).json(errorMessage);
  }
  const sql =
    "INSERT INTO senser (level, date_time, temp, humi, pump, mode) VALUES (?, ?, ?, ?, ?, ?)";
  const values = [data.level, new Date(), data.temp, data.humi, "off", "auto"];
  console.log(values);
  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing the query:", err);
      return res.json({ status: "Error", message: err });
    }
    const currentDate = new Date();
    const options = {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    const formattedDate = currentDate.toLocaleString("en-US", options);
    const responseData = {
      id: result.insertId,
      level: data.level,
      temp: data.temp,
      humi: data.humi,
      date: formattedDate,
      pump: data.pump,
      mode: data.mode,
    };
    res.json({
      status: "Success",
      ...responseData,
      message: "Data added successfully",
    });
  });
});
// PUT endpoint to update the last data in the database
app.put("/data", (req, res) => {
  const data = req.body;
  console.log("Received data from client for update:", data);

  if (data.level === undefined || data.level === null) {
    const errorMessage = {
      status: "Error",
      message: "Level value is required for updating",
    };
    return res.status(400).json(errorMessage);
  }
  // Get the last row's ID from the database
  const getLastRowIdQuery = "SELECT id FROM senser ORDER BY id DESC LIMIT 1";
  connection.query(getLastRowIdQuery, (err, result) => {
    if (err) {
      console.error("Error executing the query:", err);
      return res.json({ status: "Error", message: err });
    }
    const lastRowId = result && result.length > 0 ? result[0].id : null;
    if (!lastRowId) {
      return res.json({
        status: "Error",
        message: "No data found in the database to update",
      });
    }
    const sql =
      "UPDATE senser SET level = ?,temp = ?,humi = ?, pump = ? ,mode = ? WHERE id = ?";
    const values = [data.level, data.temp, data.humi, "off", "auto", lastRowId];
    connection.query(sql, values, (err, updateResult) => {
      if (err) {
        console.error("Error executing the update query:", err);
        return res.json({ status: "Error", message: err });
      }
      const currentDate = new Date();
      const options = {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const formattedDate = currentDate.toLocaleString("en-US", options);
      const responseData = {
        id: lastRowId,
        date_time: formattedDate,
        level: data.level,
        temp: data.temp,
        pump: data.pump,
        mode: data.mode,
      };

      res.json({
        status: "Success",
        ...responseData,
        message: "Last data updated successfully",
      });
    });
  });
});
// get date for chart
app.get("/chart", (req, res) => {
  console.log("get/chart");
  const sql = "SELECT * FROM senser ORDER BY id DESC LIMIT 10";
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      res.json({ status: "Error", message: err });
      return;
    }
    res.json({ status: "Success", data: results });
    // console.log(results);
  });
});
//mode WaterLevelAnimate when set new values and pump
app.put("/mode", (req, res) => {
  console.log("put/mode");
  const data = req.body;
  console.log(data);
  const checkSql = "SELECT COUNT(*) AS rowCount FROM mode";
  connection.query(checkSql, (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Error checking the table:", checkErr);
      return res.json({ status: "Error", message: checkErr });
    }
    const rowCount = checkResults[0].rowCount;
    console.log(rowCount, data.pump, data.mode);
    if (rowCount === 0) {
      console.log("put/mode rowCount === 0");
      // If there are no rows, perform an INSERT operation
      const insertSql = "INSERT INTO mode (level,pump ,mode) VALUES (?, ?, ?)";
      const values = [data.level, data.pump, data.mode];
      connection.query(insertSql, values, (insertErr, insertResult) => {
        if (insertErr) {
          console.error("Error executing the insert query:", insertErr);
          return res.json({ status: "Error", message: insertErr });
        }
        const responseData = {
          id: insertResult.insertId,
          level: data.level,
          pump: data.pump,
          mode: data.mode,
          message: data.mode === "manual" ? "Pump is working" : "Pump OFF",
        };
        res.json({
          status: "Success",
          ...responseData,
          message: "Data added successfully",
        });
      });
    } else if (rowCount === 1) {
      console.log("put/mode rowCount === 1");
      const selectSql = "SELECT * FROM mode";
      connection.query(selectSql, (err, Results) => {
        if (err) {
          console.error("Error executing the SELECT query:", err);
          res.json({ status: "Error", message: err });
          return;
        }

        const Odata = Results[0];

        const updateSql =
          "UPDATE mode SET level = ?,pump = ?  ,mode = ? WHERE id = ?";
        const values = [data.level, data.pump, data.mode, Odata.id];

        connection.query(updateSql, values, (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Error executing the UPDATE query:", updateErr);
            return res.json({ status: "Error", message: updateErr });
          }
          const responseData = {
            id: Odata.id,
            level: data.level,
            pump: data.pump,
            mode: data.mode,
            message:
              data.mode === "manual" ? "Pump is working ..." : "Pump OFF",
          };
          res.json({
            status: "Success",
            ...responseData,
            message: "Data updated successfully",
          });
        });
      });
    }
  });
});
//MCU get mode data to manualMode
app.get("/mode", (req, res) => {
  const sql = "SELECT * FROM mode";
  console.log("get/mode");
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      res.json({ status: "Error", message: err });
      return;
    }

    if (results.length === 0) {
      res.json({
        status: "Error",
        message: "No data found in the 'mode' table",
      });
      return;
    }

    res.json({ status: "Success", data: results[0] });
    console.log(results);
  });
});
// mode Delete when pump success process
app.delete("/mode", (req, res) => {
  const data = req.body;
  console.log(data);
  if (data.mode === null || data.mode === undefined) {
    const errorMessage = {
      status: "Error",
      message: "Level value is required for updating",
    };
    return res.status(400).json(errorMessage);
  }
});
app.post("/test", (req, res) => {
  const data = req.body;
  console.log("Received data from client:", data);
  if (data.level === undefined || data.level === null) {
    const errorMessage = {
      status: "Error",
      message: "Level value is required",
    };
    return res.status(400).json(errorMessage);
  }

  const sql = "INSERT INTO test (level) VALUES (?)";
  const values = [data.level];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error executing the query:", err);
      return res.json({ status: "Error", message: err });
    }

    const responseData = {
      id: result.insertId,
      level: data.level,
    };

    res.json({
      status: "Success",
      ...responseData,
      message: "Data added successfully",
    });
  });
});
app.get("/test", (req, res) => {
  const sql = "SELECT * FROM test ORDER BY id DESC LIMIT 1";
  connection.query(sql, (err, results) => {
    if (err) {
      console.error("Error executing the query:", err);
      res.json({ status: "Error", message: err });
      return;
    }
    res.json({ status: "Success", data: results[0] });
    console.log(results);
  });
});
const PORT = 5500;
app.listen(process.env.PORT || PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

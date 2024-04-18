class JsonDatabaseAPI {
    constructor(fileName, customCookieName, encryptionKey) {
        this.cookieName = "log";
        this.customCookieName = customCookieName;
        this.filePath = fileName;
        this.logFilePath = 'logs.txt';
        this.encryptionKey = encryptionKey; // Encryption key
        this.database = this.loadDatabase();
    }

    // Encrypt data before storing it in local storage
    encryptData(data) {
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(data), this.encryptionKey).toString();
        return encryptedData;
    }

    // Decrypt data when retrieving it from local storage
    decryptData(encryptedData) {
        const decryptedData = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey).toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedData);
    }

    getDatabase() {
        return this.database;
    }

    loadDatabase() {
        const storedData = localStorage.getItem(this.cookieName);
        const customStoredData = localStorage.getItem(this.customCookieName);

        let databaseContent;
        if (customStoredData) {
            // Decrypt custom stored data
            databaseContent = this.decryptData(customStoredData);
        } else if (storedData) {
            // Decrypt stored data
            databaseContent = this.decryptData(storedData);
        } else {
            databaseContent = {};
        }
        return databaseContent;
    }

  createEmptyFile() {
    // Initialize an empty object
    const emptyObject = {};
    // Convert the empty object to a JSON string
    const emptyObjectString = JSON.stringify(emptyObject);
    // Store the empty object string as a cookie
    localStorage.setItem(this.filePath, emptyObjectString);
  }

  log(logType, message) {
    const currentDate = new Date();
    const logEntryTime = `[(${currentDate.getUTCDate()}/${currentDate.getUTCMonth() + 1}/${currentDate.getUTCFullYear()}) (time ${currentDate.getUTCHours()}:${currentDate.getUTCMinutes()}:${currentDate.getUTCSeconds()})]`;
    const logEntry = `[${logType}] ${message}`;
    
    // Retrieve existing log entries from localStorage or initialize an empty array
    const existingLogs = localStorage.getItem(this.logFilePath);
    const logsArray = existingLogs ? JSON.parse(existingLogs) : [];
    
    // Add the new log entry to the array
    logsArray.push(`${logEntryTime}${logEntry}`);
    
    // Convert the array back to a string and store it in localStorage
    localStorage.setItem(this.logFilePath, JSON.stringify(logsArray));
    
    // Log to the console
    console.log(logEntryTime + logEntry);
  }

  saveDatabase(database) {
    try {
      // Convert the database object to a JSON string
      const databaseContent = JSON.stringify(database, null, 2);
      // Store the JSON string as a cookie
      localStorage.setItem(this.filePath, databaseContent);
    } catch (error) {
      // Log any errors
      this.log('logerror',`Error saving the database: ${error.message}`);
    }
  }

  createDatabase(databaseName) {
    if (this.database.hasOwnProperty(databaseName)) {
      const logErrorEntry =  `Database '${databaseName}' already exists.`;
      this.log('logerror', logErrorEntry);
      return;
    }
  
    this.database[databaseName] = {};
    const logInfoEntry = `Database '${databaseName}' created.`;
    this.log('loginfo', logInfoEntry);
    this.saveDatabase(this.database);
  }

  createTable(databaseName, tableName, fields) {
    if (!this.database.hasOwnProperty(databaseName)) {
        const logErrorEntry = `Database '${databaseName}' does not exist.`;
        this.log('logerror', logErrorEntry);
        return;
    }

    const database = this.database[databaseName];
    if (database.hasOwnProperty(tableName)) {
        const logErrorEntry = `Table '${tableName}' already exists in database '${databaseName}'.`;
        this.log('logerror', logErrorEntry);
        return;
    }

    if (!Array.isArray(fields)) {
        this.log('logerror', `Fields should be an array.`);
        return;
    }

    const fieldsObject = {};
    fields.forEach((field, index) => {
        fieldsObject[field] = [];
    });

    database[tableName] = fieldsObject;
    const logInfoEntry = `Table '${tableName}' created in database '${databaseName}'.`;
    this.log('loginfo', logInfoEntry);
    this.saveDatabase(this.database);
  }

  addNewFieldContent(databaseName, tableName, fieldName, contents) {
    // Check if the database exists
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }

    // Check if the table exists in the database
    const database = this.database[databaseName];
    if (!database.hasOwnProperty(tableName)) {
        this.log('logerror', `Table '${tableName}' does not exist in database '${databaseName}'.`);
        return;
    }

    // Check if the field exists in the table
    const table = database[tableName];
    if (!table.hasOwnProperty(fieldName)) {
        this.log('logerror', `Field '${fieldName}' does not exist in table '${tableName}' of database '${databaseName}'.`);
        return;
    }

    // Initialize the field if it doesn't exist
    if (!Array.isArray(table[fieldName])) {
        table[fieldName] = [];
    }

    // Get the current index for the new content
    const index = table[fieldName].length;

    // Push the index as the first element in the content array
    contents.unshift(index);

    // Push the contents array to the field
    table[fieldName].push(contents);

    this.log('loginfo', `Added content to field '${fieldName}' in table '${tableName}' of database '${databaseName}'.`);
    this.saveDatabase(this.database);
}

  editDatabase(existingDatabaseName, changedDatabaseName) {
    if (!this.database.hasOwnProperty(existingDatabaseName)) {
        this.log('logerror', `Database '${existingDatabaseName}' does not exist.`);
        return;
    }

    const databaseContent = this.database[existingDatabaseName];
    delete this.database[existingDatabaseName];
    this.database[changedDatabaseName] = databaseContent;
    this.saveDatabase(this.database);
    this.log('loginfo', `Database name changed from '${existingDatabaseName}' to '${changedDatabaseName}'.`);
  }

  editTable(databaseName, oldTableName, newTableName) {
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }

    const database = this.database[databaseName];
    if (!database.hasOwnProperty(oldTableName)) {
        this.log('logerror', `Table '${oldTableName}' does not exist in database '${databaseName}'.`);
        return;
    }

    const tableContent = database[oldTableName];
    delete database[oldTableName];
    database[newTableName] = tableContent;
    this.saveDatabase(this.database);
    this.log('loginfo', `Table name changed from '${oldTableName}' to '${newTableName}' in database '${databaseName}'.`);
  }

  editFieldsItems(databaseName, tableName, oldFieldName, newFieldName) {
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }

    const database = this.database[databaseName];
    if (!database.hasOwnProperty(tableName)) {
        this.log('logerror', `Table '${tableName}' does not exist in database '${databaseName}'.`);
        return;
    }

    const table = database[tableName];
    if (!table.hasOwnProperty(oldFieldName)) {
        this.log('logerror', `Field '${oldFieldName}' does not exist in table '${tableName}' of database '${databaseName}'.`);
        return;
    }

    const fieldItems = table[oldFieldName];
    table[newFieldName] = fieldItems;
    delete table[oldFieldName];
    this.saveDatabase(this.database);
    this.log('loginfo', `Field '${oldFieldName}' in table '${tableName}' of database '${databaseName}' was changed to '${newFieldName}'.`);
  }

  editFieldsItemsContent(databaseName, tableName, fieldName, index, oldValue, newValue) {
      // Check if the database exists
      if (!this.database.hasOwnProperty(databaseName)) {
          this.log('logerror', `Database '${databaseName}' does not exist.`);
          return;
      }
      
      // Check if the table exists in the database
      const database = this.database[databaseName];
      if (!database.hasOwnProperty(tableName)) {
          this.log('logerror', `Table '${tableName}' does not exist in database '${databaseName}'.`);
          return;
      }
      
      // Check if the field exists in the table
      const table = database[tableName];
      if (!table.hasOwnProperty(fieldName)) {
          this.log('logerror', `Field '${fieldName}' does not exist in table '${tableName}' of database '${databaseName}'.`);
          return;
      }
      
      // Check if the index is valid
      if (index < 0 || index >= table[fieldName].length) {
          this.log('logerror', `Invalid index '${index}' for field '${fieldName}' in table '${tableName}' of database '${databaseName}'.`);
          return;
      }

      // Check if the old value matches the value at the specified index
      if (table[fieldName][index][1] !== oldValue) {
          this.log('logerror', `Old value '${oldValue}' does not match the value at index '${index}' for field '${fieldName}' in table '${tableName}' of database '${databaseName}'.`);
          return;
      }

      // Update the value at the specified index
      table[fieldName][index][1] = newValue;

      // Save the updated database
      this.saveDatabase(this.database);
      this.log('loginfo', `Content of field '${fieldName}' in table '${tableName}' of database '${databaseName}' was changed from '${oldValue}' to '${newValue}' at index '${index}'.`);
  }
  editFieldsItemsContentAll(databaseName, tableName, fieldName, oldValue, newValue) {
    // Check if the database exists
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }
    
    // Check if the table exists in the database
    const database = this.database[databaseName];
    if (!database.hasOwnProperty(tableName)) {
        this.log('logerror', `Table '${tableName}' does not exist in database '${databaseName}'.`);
        return;
    }
    
    // Check if the field exists in the table
    const table = database[tableName];
    if (!table.hasOwnProperty(fieldName)) {
        this.log('logerror', `Field '${fieldName}' does not exist in table '${tableName}' of database '${databaseName}'.`);
        return;
    }
    
    // Loop through each item in the field
    table[fieldName].forEach((item, index) => {
        if (item[1] === oldValue) {
            // Update the value if it matches the old value
            item[1] = newValue;
        }
    });

    // Save the updated database
    this.saveDatabase(this.database);
    this.log('loginfo', `All occurrences of '${oldValue}' in field '${fieldName}' of table '${tableName}' in database '${databaseName}' were changed to '${newValue}'.`);
  }
  deleteDatabase(databaseName) {
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }

    delete this.database[databaseName];
    this.saveDatabase(this.database);
    this.log('loginfo', `Deleted database '${databaseName}' and its content.`);
  }

 deleteTable(databaseName, tableName) {
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }

    const database = this.database[databaseName];
    if (!database.hasOwnProperty(tableName)) {
        this.log('logerror', `Table '${tableName}' does not exist in database '${databaseName}'.`);
        return;
    }

    delete database[tableName];
    this.saveDatabase(this.database);
    this.log('loginfo', `Deleted table '${tableName}' from database '${databaseName}'.`);
  }  

  joinTable(databaseName, newTableName, tableNames, fields) {
    // Check if the database exists
    if (!this.database.hasOwnProperty(databaseName)) {
        this.log('logerror', `Database '${databaseName}' does not exist.`);
        return;
    }

    // Check if all specified tables exist in the database
    const database = this.database[databaseName];
    for (const tableName of tableNames) {
        if (!database.hasOwnProperty(tableName)) {
            this.log('logerror', `Table '${tableName}' does not exist in database '${databaseName}'.`);
            return;
        }
    }

    // Create a new table object
    const newTable = {};

    // Iterate over each specified field
    for (const field of fields) {
        let fieldCount = 0;
        // Iterate over each specified table
        for (const tableName of tableNames) {
            const table = database[tableName];
            // Check if the field exists in the current table
            if (table.hasOwnProperty(field)) {
                // Increment field count if field exists
                fieldCount++;
                // Create a new field name if the field exists in multiple tables
                if (fieldCount > 1) {
                    newTable[`${field}repeat${fieldCount - 1}`] = table[field];
                } else {
                    newTable[field] = table[field];
                }
            }
        }
    }

    // Add the new table to the database
    database[newTableName] = newTable;

    // Log and save changes
    this.log('loginfo', `Joined tables ${tableNames.join(', ')} into a new table '${newTableName}' in database '${databaseName}'.`);
    this.saveDatabase(this.database);
}
joinDatabaseAndTable(databaseNames, newDatabaseName, newTableName, tableNames, fields) {
  const newDatabase = {};
  const newTable = {};

  // Iterate through each specified database
  for (const dbName of databaseNames) {
      // Check if the current database exists
      if (!this.database.hasOwnProperty(dbName)) {
          this.log('logerror', `Database '${dbName}' does not exist.`);
          return;
      }

      const currentDatabase = this.database[dbName];

      // Iterate through each specified table in the current database
      for (const tableName of tableNames) {
          // Check if the current table exists in the current database
          if (currentDatabase.hasOwnProperty(tableName)) {
              const currentTable = currentDatabase[tableName];

              // Iterate through each field in the current table
              for (const field of fields) {
                  // Check if the current field exists in the current table
                  if (currentTable.hasOwnProperty(field)) {
                      // Check if the field already exists in the new table
                      if (newTable.hasOwnProperty(field)) {
                          // Append 'repeat' suffix to the field name
                          let repeatedFieldName = field;
                          let repeatIndex = 1;
                          while (newTable.hasOwnProperty(repeatedFieldName)) {
                              repeatIndex++;
                              repeatedFieldName = `${field}repeat${repeatIndex}`;
                          }
                          // Add the repeated field to the new table
                          newTable[repeatedFieldName] = currentTable[field];
                      } else {
                          // Add the field to the new table
                          newTable[field] = currentTable[field];
                      }
                  }
              }
          }
      }
  }

  // Add the new table to the new database
  newDatabase[newTableName] = newTable;

  // Add the new database to the global database
  this.database[newDatabaseName] = newDatabase;

  this.log('loginfo', `Created new table '${newTableName}' in database '${newDatabaseName}' with the specified fields from the specified databases and tables.`);
  this.saveDatabase(this.database);
}
joinDatabaseAndTableInCurrentDb(databaseNames, existingDatabaseName, newTableName, tableNames, fields) {
  // Check if the existing database exists
  if (!this.database.hasOwnProperty(existingDatabaseName)) {
      this.log('logerror', `Database '${existingDatabaseName}' does not exist.`);
      return;
  }

  const existingDatabase = this.database[existingDatabaseName];

  const newTable = {};

  // Iterate through each specified database
  for (const dbName of databaseNames) {
      // Check if the current database exists in the list of specified databases
      if (this.database.hasOwnProperty(dbName)) {
          const currentDatabase = this.database[dbName];

          // Iterate through each specified table in the current database
          for (const tableName of tableNames) {
              // Check if the current table exists in the current database
              if (currentDatabase.hasOwnProperty(tableName)) {
                  const currentTable = currentDatabase[tableName];

                  // Iterate through each field in the current table
                  for (const field of fields) {
                      // Check if the field exists in the current table
                      if (currentTable.hasOwnProperty(field)) {
                          // Check if the field already exists in the new table
                          if (newTable.hasOwnProperty(field)) {
                              // Append 'repeat' suffix to the field name
                              let repeatedFieldName = field;
                              let repeatIndex = 1;
                              while (newTable.hasOwnProperty(repeatedFieldName)) {
                                  repeatIndex++;
                                  repeatedFieldName = `${field}repeat${repeatIndex}`;
                              }
                              // Add the repeated field to the new table
                              newTable[repeatedFieldName] = currentTable[field];
                          } else {
                              // Add the field to the new table
                              newTable[field] = currentTable[field];
                          }
                      }
                  }
              }
          }
      }
  }

  // Add the new table to the existing database
  existingDatabase[newTableName] = newTable;

  this.log('loginfo', `Created new table '${newTableName}' in database '${existingDatabaseName}' with the specified fields from the specified databases and tables.`);
  this.saveDatabase(this.database);
}



}

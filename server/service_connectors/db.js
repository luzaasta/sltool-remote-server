/*require the ibm_db module*/
var deferred = require('deferred');
var Pool = require('ibm_db').Pool;
var pgdb = require('pg');
var fs = require('fs');

var pool = new Pool();
pool.setMaxPoolSize(20);
pool.setConnectTimeout(5);

function refreshAccess(conf, result) {
	var funcName = "access" + conf.db_type;
	if (!accessFn[funcName]) {
		result.failed = true;
		result.message = "Unknown DB type";
		return deferred(1);
	}

	return accessFn["access" + conf.db_type](conf, result);
}

var accessFn = {

	// access postgreSQL
	accessPostgreSQL: function(conf, result) {
		var def = deferred();

		var connectionString = `postgresql://${conf.user}:${conf.pass}@${conf.host}:${conf.port}/${conf.db}`;

		var client = new pgdb.Client(connectionString);
		client.connect(function(err) {
			if (err) {
				result.failed = true;
				result.message = err.toString();
				client.end();
				def.resolve();
			}
		});
		var dst = conf.schema == "" ? conf.table : conf.schema + '.' + conf.table;
		client.query(`SELECT * FROM ${dst} LIMIT(5)`, function(err, res) {
			if (err) {
				result.failed = true;
				result.message = err.toString();
			} else {
				result.message = "Access OK and refreshed!";
			}

			client.end();
			def.resolve();
		});

		return def.promise;
	},

	// access DB2
	accessDB2: function(conf, result) {
		var def = deferred();

		var connStr = `DRIVER={DB2};DATABASE=${conf.db};UID=${conf.user};PWD=${conf.pass};HOSTNAME=${conf.host};port=${conf.port}`;


		/* Connect to the database server
		 * param 1: The DSN string which has the details of database name to connect to, user id, password, hostname, portnumber
		 * param 2: The Callback function to execute when connection attempt to the specified database is completed
		 */
		pool.open(connStr, function(err, conn) {
			if (err) {
				/*
				 * On error in connection, log the error message on console
				 */
				// result.push("error: ", err.message);
				result.failed = true;
				result.message = err.toString();
				def.resolve();
			} else {
				/*
				 * On successful connection issue the SQL query by calling the query() function on Database
				 * param 1: The SQL query to be issued
				 * param 2: The callback function to execute when the database server responds
				 */
				var dst = conf.schema == "" ? conf.table : conf.schema + '.' + conf.table;
				conn.query(`SELECT * FROM ${dst} fetch first 5 rows only`, function(err, rows, moreResultSets) {
					if (err) {
						result.failed = true;
						result.message = err.toString();
					} else {
						result.message = "Access OK and refreshed!";
					}

					/*
						Loop through the employees list returned from the select query and print the First name and last name of the employee
					*/
					/*for (var i = 0; i < rows.length; i++) {
						result.push(rows[i].KASITTELIJA, "\t\t", rows[i].LUOTU);
					}

					/*
					 * Close the connection to the database
					 * param 1: The callback function to execute on completion of close function.
					 */
					conn.close();
					def.resolve();
				});
			}
		});

		return def.promise;
	}
};

function closePool() {
	pool.close();
}


module.exports = refreshAccess;
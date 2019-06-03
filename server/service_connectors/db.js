/*require the ibm_db module*/
var deferred = require('deferred');
var Pool = require('ibm_db').Pool;
var pgdb = require('pg');
var fs = require('fs');

var pool = new Pool();
pool.setMaxPoolSize(20);
pool.setConnectTimeout(5);

function refreshAccess(conf) {
	var funcName = "access" + conf.db_type;
	if (!accessFn[funcName]) {
		return deferred.reject("Unknown DB type");
	}

	return accessFn["access" + conf.db_type](conf);
}

var accessFn = {

	// access postgreSQL
	accessPostgreSQL: function(conf) {
		var def = deferred();

		var connectionString = `postgresql://${conf.user}:${conf.pass}@${conf.host}:${conf.port}/${conf.db}`;

		var client = new pgdb.Client(connectionString);
		client.connect(function(err) {
			if (err) {
				client.end();
				def.reject(err.toString());
			}
		});
		var dst = conf.schema == "" ? conf.table : conf.schema + '.' + conf.table;
		client.query(`SELECT * FROM ${dst} LIMIT(5)`, function(err, res) {
			if (err) {
				def.reject(err.toString());
			} else {
				def.resolve("OK");
			}

			client.end();
		});

		return def.promise;
	},

	// access DB2
	accessDB2: function(conf) {
		var def = deferred();

		var connStr = `DRIVER={DB2};DATABASE=${conf.db};UID=${conf.user};PWD=${conf.pass};HOSTNAME=${conf.host};port=${conf.port}`;


		/* Connect to the database server
		 * param 1: The DSN string which has the details of database name to connect to, user id, password, hostname, portnumber
		 * param 2: The Callback function to execute when connection attempt to the specified database is completed
		 */
		pool.open(connStr, function(err, conn) {
			if (err) {
				/*
				 * On error in connection
				 */
				def.reject(err.toString());
				return;
			} else {
				/*
				 * On successful connection issue the SQL query by calling the query() function on Database
				 * param 1: The SQL query to be issued
				 * param 2: The callback function to execute when the database server responds
				 */
				var dst = conf.schema == "" ? conf.table : conf.schema + '.' + conf.table;
				conn.query(`SELECT * FROM ${dst} fetch first 5 rows only`, function(err, rows, moreResultSets) {
					if (err) {
						def.reject(err.toString());
					} else {
						def.resolve("OK");
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
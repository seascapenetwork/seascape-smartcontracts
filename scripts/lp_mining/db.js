let mysql = require('mysql');


module.exports.getConnection = async function() {
	let con = mysql.createConnection({
		host: process.env.DATABASE_HOST,
		user: process.env.DATABASE_USERNAME,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.LOGS_DATABASE_NAME
	});

	let res = await con.connect();

	return con;
};
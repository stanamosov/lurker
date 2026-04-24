const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("node:path");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

const routes = require("./routes/index");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "assets")));
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 100,
		message: "Too many requests from this IP, please try again later.",
		standardHeaders: true,
		legacyHeaders: false,
	}),
);
app.use("/", routes);

const port = process.env.LURKER_PORT;
const server = app.listen(port ? port : 3000, "0.0.0.0", () => {
	console.log("started on", server.address());
});

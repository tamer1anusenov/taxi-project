var { gulp, src, dest, watch, series, parallel } = require("gulp");
var del = require("del");
var package = require("./package.json");
var fileinclude = require("gulp-file-include");
var htmlbeautify = require("gulp-html-beautify");
var concat = require("gulp-concat");
var minify = require("gulp-minify");
var sass = require("gulp-sass");
var autoprefixer = require("gulp-autoprefixer");
var browserSync = require("browser-sync");


// Файлдардың жататын жері және көшірілетін жолы
var paths = {

	// Общий
	input: "src/",
	output: "build/",

	// Жаваскрипттар
	srcJs: {
		input: "src/js/*.js",
		output: "build/js"
	},

	// SCSSтар
	styles: {
		input: "src/sass/**/*.{scss,sass}",
		output: "build/"
	},

	// Хтмлдар
	srcHTML: {
		input: "src/html/*.html",
		output: "build/"
	},

	// Статический файлдар (картинкалар, видеолар, т.б)
	staticFiles: {
		input: [
			"src/assets/**/*",
			// "src/uploads/**/*", // осылай тағы папкалар қоса беруге болат
		],
		output: "build/"
	},

	// Бірдеңе өзгергенде браузерды обновить ету үшін керек папка
	reload: "./build/"
};



// /build/ папкасын кетіріп тастайтын задача
exports.cleanup = function (done) {

	// папканы кетіру
	del.sync([paths.output]);

	// Болдым
	return done();
};




// Статический файлдарды (картинкалар, видеолар т.б) /src/ папкасынан алып, жай ғана /build/ папкасына лақтырып жібереді
var copyStaticFilesTask = function (done) {
	return src(paths.staticFiles.input, { base: "./src/" }).pipe(
		dest(paths.staticFiles.output)
	);
};



// Жаваскрипттарымызды алып, минимизировать етеді
var jsTask = function (done) {

	return src(paths.srcJs.input)
		.pipe(
			minify({ mangle: false })
		)
		.pipe(dest(paths.srcJs.output));
};




// SASS файлдарды алып, CSSке айналдырады
var stylesTask = function (done) {

	return src(paths.styles.input)
		.pipe(
			sass({
				outputStyle: "expanded",
				sourceComments: false,
				indentType: "tab",
				indentWidth: 1
			})
		)
		.pipe(
			autoprefixer({
				cascade: false
			})
		)
		.pipe(dest(paths.styles.output))
		.pipe(browserSync.stream());
};



// Generate HTMLs
var htmlTask = function (done) {

	return src(paths.srcHTML.input)
		.pipe(
			fileinclude({
				prefix: "@@",
				basepath: "@file"
			})
		)
		.pipe(
			htmlbeautify({
				indentSize: 4,
				indent_with_tabs: true,
				preserve_newlines: true,
				max_preserve_newlines: 3,
				end_with_newline: true
			})
		)
		.pipe(dest(paths.srcHTML.output));
};



// Watch for changes to the src directory
var startServer = function (done) {
	// Initialize BrowserSync
	browserSync.init({
		server: {
			baseDir: paths.reload
		},
		notify: false,
		// open: false,
	});

	done();
};


// Reload the browser when files change
var reloadBrowser = function (done) {
	browserSync.reload();
	done();
};





// Watch for changes
var watchSource = function (done) {

	// Watch and copy all files except for static resources
	watch( paths.styles.input, series(parallel(stylesTask)) );
	watch("src/html/**/*.html", series(exports.devTaskHtml, reloadBrowser));
	watch(paths.srcJs.input, series(exports.devTaskJs, reloadBrowser));

	// Watch static recources, if changes, then run build task, which copies all static files to build
	watch(paths.staticFiles.input, series(exports.build, reloadBrowser));

	done();
};



//  Development tasks that run when files are changed
exports.devTaskHtml = series(parallel(htmlTask));
exports.devTaskJs = series(parallel(jsTask));



// Build
exports.build = series(
	// cleanup,
	parallel(jsTask, stylesTask, htmlTask, copyStaticFilesTask)
);

// Watch and reload
exports.watch = series(exports.build, startServer, watchSource);

// Default task (same as watch)
exports.default = series(exports.build, startServer, watchSource);

/*!
 * ioBroker gulpfile
 * Date: 2022-07-08
 */
'use strict';

const gulp = require('gulp');
const fs = require('fs');
const cp = require('child_process');
const adapterName = require('./package.json').name.replace('iobroker.', '');

const SRC = 'src-widgets/';
const src = `${__dirname}/${SRC}`;

function deleteFoldersRecursive(path, exceptions) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);
        for (const file of files) {
            const curPath = `${path}/${file}`;
            if (exceptions && exceptions.find(e => curPath.endsWith(e))) {
                continue;
            }

            const stat = fs.statSync(curPath);
            if (stat.isDirectory()) {
                deleteFoldersRecursive(curPath);
                fs.rmdirSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        }
    }
}

function npmInstall() {
    return new Promise((resolve, reject) => {
        // Install node modules
        const cwd = src.replace(/\\/g, '/');

        //const cmd = `npm install -f`;
        const cmd = `yarn`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
        const exec = cp.exec;
        const child = exec(cmd, {cwd});

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot install: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

function startDevServerWatch() {
    return new Promise((resolve, reject) => {
        //const cmd = `npm install -f`;
        const cwd='./'
        try {
            const isDir=fs.statSync('./.dev-server/').isDirectory();
         } catch (e) {
              reject('cannot start dev-server since it was not found');
        }
        const cmd = `dev-server watch`;
        console.log(`"${cmd} in ${cwd}`);

        // System call used for update of js-controller itself,
        // because during installation npm packet will be deleted too, but some files must be loaded even during the install process.
        const exec = cp.exec;

        const child = exec(cmd, {cwd});

        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);

        child.on('exit', (code /* , signal */) => {
            // code 1 is strange error that cannot be explained. Everything is installed but error :(
            if (code && code !== 1) {
                reject(`Cannot start dev-server: ${code}`);
            } else {
                console.log(`"${cmd} in ${cwd} finished.`);
                // command succeeded
                resolve();
            }
        });
    });
}

function buildRules() {
    const version = JSON.parse(fs.readFileSync(`${__dirname}/package.json`).toString('utf8')).version;
    const data    = JSON.parse(fs.readFileSync(`${src}package.json`).toString('utf8'));

    data.version = version;

    fs.writeFileSync(`${src}package.json`, JSON.stringify(data, null, 4));

    // we have bug, that federation requires version number in @mui/material/styles, so we have to change it
    // read version of @mui/material and write it to @mui/material/styles
    const muiStyleVersion = require(`${src}node_modules/@mui/material/styles/package.json`);
    if (!muiStyleVersion.version) {
        const muiVersion = require(`${src}node_modules/@mui/material/package.json`);
        muiStyleVersion.version = muiVersion.version;
        fs.writeFileSync(`${src}node_modules/@mui/material/styles/package.json`, JSON.stringify(muiStyleVersion, null, 2));
    }

    return new Promise((resolve, reject) => {
        const options = {
            stdio: 'pipe',
            cwd: src
        };

        console.log(options.cwd);

        let script = `${src}node_modules/@craco/craco/dist/bin/craco.js`;
        if (!fs.existsSync(script)) {
            script = `${__dirname}/node_modules/@craco/craco/dist/bin/craco.js`;
        }
        if (!fs.existsSync(script)) {
            console.error(`Cannot find execution file: ${script}`);
            reject(`Cannot find execution file: ${script}`);
        } else {
            const child = cp.fork(script, ['build'], options);
            child.stdout.on('data', data => console.log(data.toString()));
            child.stderr.on('data', data => console.log(data.toString()));
            child.on('close', code => {
                console.log(`child process exited with code ${code}`);
                code ? reject(`Exit code: ${code}`) : resolve();
            });
        }
    });
}

gulp.task('widget-0-clean', done => {
    deleteFoldersRecursive(`${src}build`);
    deleteFoldersRecursive(`widgets`);
    done();
});
gulp.task('widget-1-npm', async () => npmInstall());

gulp.task('widget-2-compile', async () => buildRules());

gulp.task('widget-3-createdirectories', () => Promise.all([
    new Promise(resolve =>
        setTimeout(() => {
            if (fs.existsSync(`widgets/${adapterName}/static/js`) &&
                !fs.readdirSync(`widgets/${adapterName}/static/js`).length
            ) {
                fs.rmdirSync(`widgets/${adapterName}/static/js`)
            }
            resolve();
        }, 500)
    ),
    new Promise(resolve =>
        setTimeout(() => {
            if (fs.existsSync(`widgets/${adapterName}/static/media`) &&
                !fs.readdirSync(`widgets/${adapterName}/static/media`).length
            ) {
                fs.rmdirSync(`widgets/${adapterName}/static/media`)
            }
            resolve();
        }, 500)
    )
]));

gulp.task('widget-4-copy', () => Promise.all([
    gulp.src([`${SRC}build/*.js`]).pipe(gulp.dest(`widgets/${adapterName}`)),
    gulp.src([`${SRC}build/img/*`]).pipe(gulp.dest(`widgets/${adapterName}/img`)),
    gulp.src([`${SRC}build/*.map`]).pipe(gulp.dest(`widgets/${adapterName}`)),
    gulp.src([`${SRC}build/static/js/node_modules*.*`]).pipe(gulp.dest(`widgets/${adapterName}/static/js`)),
    gulp.src([`${SRC}build/static/js/vendors-node_modules*.*`]).pipe(gulp.dest(`widgets/${adapterName}/static/js`)),
    gulp.src([`${SRC}build/static/js/main*.*`]).pipe(gulp.dest(`widgets/${adapterName}/static/js`)),
    gulp.src([`${SRC}build/static/js/src_bootstrap*.*`]).pipe(gulp.dest(`widgets/${adapterName}/static/js`)),
    gulp.src([`${SRC}build/static/js/src_*.*`]).pipe(gulp.dest(`widgets/${adapterName}/static/js`)),
    gulp.src([`${SRC}build/static/media/TrashIcon*.*`]).pipe(gulp.dest(`widgets/${adapterName}/static/media`)),
    gulp.src([`${SRC}src/i18n/*.json`]).pipe(gulp.dest(`widgets/${adapterName}/i18n`))
]));

gulp.task('widget-5-start-dev-server', async () => startDevServerWatch());

gulp.task('widget-build', gulp.series(['widget-0-clean', 'widget-1-npm', 'widget-2-compile', 'widget-3-createdirectories', 'widget-4-copy']));
//gulp.task('widget-build', gulp.series(['widget-3-createdirectories', 'widget-4-copy']));

gulp.task('default', gulp.series('widget-build'));




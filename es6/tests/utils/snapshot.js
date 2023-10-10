const chai = require("chai");
const expect = chai.expect;
const fs = require("fs");
const { unhandledRejectionHandler } = require("./error.js");

if (typeof process === "undefined") {
	global.process = {};
}

const writeSnapshots =
	typeof process !== "undefined" &&
	// eslint-disable-next-line no-process-env
	process.env &&
	// eslint-disable-next-line no-process-env
	process.env.WRITE_SNAPSHOTS === "true";

let countFiles = 1;
let allStarted = false;
let startFunction = null;
let snapshotFile = "";

function addCountFiles(num) {
	countFiles += num;
}

function setAllStarted(value) {
	allStarted = value;
}

function setStartFunction(sf, snapshots = {}) {
	allStarted = false;
	countFiles = 1;
	startFunction = sf;

	const runnedSnapshots = {};
	let fullTestName = "";
	function matchSnapshot() {
		let ftn = fullTestName;
		let i = 0;
		while (runnedSnapshots[ftn]) {
			i++;
			ftn = fullTestName + "-" + i;
		}
		runnedSnapshots[ftn] = true;
		const obj = JSON.parse(JSON.stringify(this.__flags.object));
		if (!snapshots[ftn]) {
			snapshots[ftn] = obj;
			if (!writeSnapshots) {
				throw new Error(`Snapshot not found for '${ftn}'`);
			}
			return;
		}

		try {
			expect(obj).to.deep.equal(snapshots[ftn]);
		} catch (e) {
			if (writeSnapshots) {
				snapshots[ftn] = obj;
				return;
			}
			throw e;
		}
	}
	beforeEach(function () {
		function getParentsTitle(a) {
			if (a.parent) {
				return `${a.parent.title} ${getParentsTitle(a.parent)}`;
			}
			return "";
		}
		fullTestName = getParentsTitle(this.currentTest) + this.currentTest.title;
	});
	after(function () {
		if (writeSnapshots) {
			const sortedKeys = Object.keys(snapshots).sort();
			const output =
				"/***************** This file is autogenerated *****************************\n\n" +
				"   Please don't modify it manually !\n" +
				"   Instead, to update the file, run :\n\n" +
				"   npm run test:es6:update-snapshots\n*/\n\n" +
				sortedKeys
					.map(function (key) {
						const snap = snapshots[key];
						return "exports[`" + key + "`] = " + JSON.stringify(snap, null, 2);
					})
					.join("\n\n") +
				"\n\n";
			fs.writeFileSync(snapshotFile, output);
		}
	});
	chai.use(function () {
		chai.Assertion.addMethod("matchSnapshot", matchSnapshot);
	});
	if (typeof window !== "undefined" && window.addEventListener) {
		window.addEventListener("unhandledrejection", unhandledRejectionHandler);
	} else {
		process.on("unhandledRejection", unhandledRejectionHandler);
	}
}

function endLoadFile(change) {
	change = change || 0;
	countFiles += change;
	if (countFiles === 0 && allStarted === true) {
		const result = startFunction();
		if (typeof window !== "undefined") {
			return window.mocha.run(() => {
				const elemDiv = window.document.getElementById("status");
				elemDiv.textContent = "FINISHED";
				document.body.appendChild(elemDiv);
			});
		}
		return result;
	}
}

function setSnapshotFile(file) {
	snapshotFile = file;
}

module.exports = {
	addCountFiles,
	setAllStarted,
	setStartFunction,
	endLoadFile,
	setSnapshotFile,
};

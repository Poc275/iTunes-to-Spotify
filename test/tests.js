var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var expect = require('chai').expect;
var Track = require('../models/Track');
var Playlist = require('../models/Playlist');
var XMLParser = require('../models/XMLParser');


describe('object instantiation tests', function() {
	var parser = new XMLParser();
	var playlist = new Playlist('test');
	var track = new Track('title', 'artist', 'album');

	it('xml parser object instantiates OK', function() {
		expect(parser).to.be.an.instanceOf(XMLParser);
	});

	it('playlist object instantiates OK', function() {
		expect(playlist).to.be.an.instanceOf(Playlist);
	});

	it('track object instantiates OK', function() {
		expect(track).to.be.an.instanceOf(Track);
	});
});


describe('iTunes xml parsing tests', function () {
	var parser = new XMLParser();
	var fakeParser = new XMLParser();
	var invalidParser = new XMLParser();

	before(function(done) {
		parser.parse('test.xml', function(err) {
			done();
		});
	});

    it('XML file reads OK', function() {
    	expect(parser._parsedXml).to.not.be.null;
    });

    it('Non existent XML file throws error', function() {
    	fakeParser.parse('fake.xml', function(err) {
    		expect(err).to.not.be.null;
    	});
    });

    it('Invalid XML throws error', function() {
    	invalidParser.parse('invalid-xml.xml', function(err) {
    		expect(err).to.not.be.null;
    	});
    });
});


describe('File upload tests', function () {
	var parser = new XMLParser();
	var fakeParser = new XMLParser();

	before(function(done) {
		fs.readFile(path.join(__dirname, '../data/buffer.txt'), function(err, data) {
			if(err) {
				throw err;
			}

			parser.parseBuffer(data, function(err) {
				if(err) {
					throw err;
				}
				done();
			});
		});
	});

    it('uploaded file buffer can be read OK', function() {
    	expect(parser._parsedXml).to.not.be.null;
    });

    it('failed upload throws error', function() {
    	fakeParser.parseBuffer(null, function(err) {
    		expect(err).to.not.be.null;
    	});
    });
});


describe('iTunes single playlist xml file tests', function() {
	var parser = new XMLParser();

	before(function(done) {
		parser.parse('test.xml', function(err) {
			parser.getPlaylists();
			done();
		});
	});

	it('test.xml contains 1 playlist', function() {
		expect(parser._playlists).to.have.lengthOf(1);
	});

	it('test.xml playlist contains 23 track ids', function() {
		expect(parser._playlists[0]._trackIds).to.have.lengthOf(23);
	});

	it('test.xml playlist object name correct', function() {
		expect(parser._playlists[0]._name).to.equal('Best Bits');
	});

	it('test.xml playlist track ids are correct', function() {
		expect(parser._playlists[0]._trackIds[0]).to.equal('34532');
		expect(parser._playlists[0]._trackIds[5]).to.equal('39718');
		expect(parser._playlists[0]._trackIds[10]).to.equal('36544');
		expect(parser._playlists[0]._trackIds[15]).to.equal('32392');
		expect(parser._playlists[0]._trackIds[22]).to.equal('36014');
	});

	it('get playlist by name works correctly', function() {
		var playlist = parser.getPlaylistByName('Best Bits');
		expect(playlist._name).to.equal('Best Bits');
		expect(playlist._trackIds).to.have.lengthOf(23);
	});

	it('get playlist by name returns undefined if playlist does not exist', function() {
		var playlist = parser.getPlaylistByName('fake');
		expect(playlist).to.be.undefined;
	});
});


describe('iTunes single playlist xml file track tests', function() {
	var parser = new XMLParser();

	before(function(done) {
		parser.parse('test.xml', function(err) {
			parser.getTracks();
			done();
		});
	});

	it('test.xml contains 23 tracks', function() {
		expect(parser._tracks).to.have.lengthOf(23);
	});

	it('test.xml first track is correct', function() {
		expect(parser._tracks[0]._id).to.equal('5450');
		expect(parser._tracks[0]._title).to.equal('Banquet');
		expect(parser._tracks[0]._artist).to.equal('Bloc Party');
		expect(parser._tracks[0]._album).to.equal('Silent Alarm');
	});

	it('test.xml last track is correct', function() {
		expect(parser._tracks[22]._id).to.equal('48334');
		expect(parser._tracks[22]._title).to.equal('Strange Overtones');
		expect(parser._tracks[22]._artist).to.equal('Brian Eno & David Byrne');
		expect(parser._tracks[22]._album).to.equal('Everything That Happens Will Happen Today');
	});

	it('get track by id works correctly', function() {
		var track = parser.getTrackById('36466');
		expect(track._id).to.equal('36466');
		expect(track._title).to.equal('Interstellar Theme');
		expect(track._artist).to.equal('The Aviators');
		expect(track._album).to.equal('The Aviators');
	});

	it('get track by id returns undefined if track does not exist', function() {
		var track = parser.getTrackById('fake');
		expect(track).to.be.undefined;
	});
});


describe('iTunes full library xml file tests', function() {
	var parser = new XMLParser();

	before(function(done) {
		parser.parse('library.xml', function(err) {
			parser.getPlaylists();
			parser.getTracks();
			done();
		});
	});

	it('library.xml contains 48 playlists', function() {
		expect(parser._playlists).to.have.lengthOf(48);
	});

	it('library.xml final playlist contains 3 track ids', function() {
		expect(parser._playlists[47]._trackIds).to.have.lengthOf(2);
	});

	it('library.xml final playlist object name correct', function() {
		expect(parser._playlists[47]._name).to.equal('Untouchable Tracks');
	});

	it('library.xml final playlist track ids are correct', function() {
		expect(parser._playlists[47]._trackIds[0]).to.equal('34329');
		expect(parser._playlists[47]._trackIds[1]).to.equal('20113');
	});

	it('Tones playlist created but is empty', function() {
		var tonesPlaylist = parser.getPlaylistByName('Tones');
		expect(tonesPlaylist).to.not.be.null;
		expect(tonesPlaylist._name).to.equal('Tones');
		expect(tonesPlaylist._trackIds).to.have.lengthOf(0);
	});

	it('library.xml parses all tracks correctly', function() {
		expect(parser._tracks).to.have.length.above(0);
	});
});

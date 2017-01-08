function Track(id, title, artist, album) {
	this._id = id;
	this._title = title;
	this._artist = artist;
	this._album = album;
	this._spotifyUri = null;
}

// returns an encoded string for the search endpoint
Track.prototype.toString = function() {
	// testing showed that just providing the track and artist gives the
	// best results when searching, if the provided album name isn't precise
	// then the search doesn't find anything
	return encodeURIComponent('track:"' + this._title + '" artist:"' + this._artist + '"');
}

module.exports = Track;
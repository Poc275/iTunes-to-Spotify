function Playlist(name) {
	this._name = name;
	this._trackIds = [];
}

Playlist.prototype.addTrackId = function(id) {
	this._trackIds.push(id);
}

module.exports = Playlist;
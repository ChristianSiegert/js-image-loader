self.onmessage = function(event) {
	var indexes = [];
	var containerCoordinates = event.data.containerCoordinates;
	var elementCoordinates = event.data.elementCoordinates;

	for (var i = 0; i < elementCoordinates.length; i++) {
		if (elementIsVisible(elementCoordinates[i], containerCoordinates)) {
			indexes.push(i);
		}
	}

	self.postMessage(indexes);
};

function elementIsVisible(elementCoordinates, containerCoordinates) {
	return elementCoordinates.bottom >= containerCoordinates.top
		&& elementCoordinates.top <= containerCoordinates.bottom
		&& elementCoordinates.right >= containerCoordinates.left
		&& elementCoordinates.left <= containerCoordinates.right;
}
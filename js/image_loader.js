// ImageLoader class. Scroll to bottom for example usage.
var ImageLoader = new Class({
	Implements: [Events, Options],

	// Default options
	options: {
		container: window,

		// Name of the "img" elements' data attribute that stores the image URL
		dataAttribute: "data-src",

		// Delay between loading two images (in milliseconds)
		delay: 0,

		// Array of "img" elements whose content we want to lazy load
		elements: [],

		// Maximum number of concurrent downloads
		maxConcurrentDownloads: 4,

		// Maximum distance that images can be away from the visible part of the
		// container and still be loaded
		maxDistance: 250,

		// CSS class that is used to hide empty image elements from people with
		// JavaScript disabled
		noJsClass: "no-js"
	},

	initialize: function(options) {
		// Merge provided options with default options
		this.setOptions(options);

		// Make hidden image elements visible for people with JavaScript enabled
		$(document.body).removeClass(this.options.noJsClass);

		// Number of loaded images
		this.loadedImagesCount = 0;

		// Number of running downloads
		this.concurrentDownloads = 0;

		// Timeout IDs of delayed functions (queued downloads)
		this.timeoutIds = [];

		this.loadedElements = [];
		this.unloadedElements = this.options.elements.slice();

		this.loadedElementsCoordinates = [];
		this.unloadedElementsCoordinates = [];

		this.elementsToLoad = [];
		this.containerCoordinates = {};
	},

	/**
	 * Starts the image loader.
	 */
	run: function() {
		this.fetchContainerCoordinates();
		this.fetchElementCoordinates();
		this.fetchOriginalSrc();
		this.manageImages();

		window.addEvent("resize", function() {
			if (this.resizeTimeoutId) {
				clearTimeout(this.resizeTimeoutId);
			}

			this.resizeTimeoutId = function() {
				this.fetchContainerCoordinates();
				this.fetchElementCoordinates();
				this.manageImages();
			}.bind(this).delay(50);
		}.bind(this));

		window.addEvent("scroll", function() {
			if (this.scrollTimeoutId) {
				clearTimeout(this.scrollTimeoutId);
			}

			this.scrollTimeoutId = function() {
				this.fetchContainerCoordinates();
				this.manageImages();
			}.bind(this).delay(50);
		}.bind(this));
	},

	fetchContainerCoordinates: function() {
		var containerScroll = this.options.container.getScroll();
		var containerSize = this.options.container.getSize();

		this.containerCoordinates = {
			bottom: containerScroll.y + containerSize.y + this.options.maxDistance,
			left: containerScroll.x - this.options.maxDistance,
			right: containerScroll.x + containerSize.x + this.options.maxDistance,
			top: containerScroll.y - this.options.maxDistance
		}
	},

	fetchElementCoordinates: function() {
		this.loadedElementsCoordinates = [];
		this.unloadedElementsCoordinates = [];

		for (var i = 0; i < this.loadedElements.length; i++) {
			this.loadedElementsCoordinates.push(this.loadedElements[i].getCoordinates());
		}

		for (var i = 0; i < this.unloadedElements.length; i++) {
			this.unloadedElementsCoordinates.push(this.unloadedElements[i].getCoordinates());
		}
	},

	fetchOriginalSrc: function() {
		for (var i = 0; i < this.options.elements.length; i++) {
			this.options.elements[i].store("originalSrc", this.options.elements[i].getProperty("src"));
		}
	},

	manageImages: function() {
		this.cancelQueuedDownloads();
		this.unloadLoadedElements();
		this.loadUnloadedElements();
		this.loadConcurrently();
	},

	cancelQueuedDownloads: function() {
		for (var i = 0; i < this.timeoutIds.length; i++) {
			clearTimeout(this.timeoutIds[i]);
		}

		this.timeoutIds = [];
	},

	unloadLoadedElements: function() {
		for (var i = 0; i < this.loadedElements.length; i++) {
			if (!this.elementIsVisible(this.loadedElementsCoordinates[i], this.containerCoordinates)) {
				this.loadedElements[i].setProperty("src", this.loadedElements[i].retrieve("originalSrc"));
				this.unloadedElements.push(this.loadedElements.splice(i, 1)[0]);
				this.unloadedElementsCoordinates.push(this.loadedElementsCoordinates.splice(i, 1)[0]);
				i--;
			}
		}
	},

	loadUnloadedElements: function() {
		this.elementsToLoad = [];

		for (var i = 0; i < this.unloadedElements.length; i++) {
			if (this.elementIsVisible(this.unloadedElementsCoordinates[i], this.containerCoordinates)) {
				this.elementsToLoad.push(this.unloadedElements[i]);
			}
		}
	},

	loadConcurrently: function() {
		for (var i = this.concurrentDownloads; i < this.options.maxConcurrentDownloads; i++) {
			this.loadNextImage();
		}
	},

	/**
	 * Loads the next image.
	 */
	loadNextImage: function() {
		if (this.elementsToLoad.length === 0) {
			return;
		}

		this.loadImage(this.elementsToLoad.splice(0, 1)[0]);
	},

	/**
	 * Loads a particular image.
	 *
	 * Fires a class-wide "load" event if the image loaded, otherwise an "error"
	 * event. Also fires a class-wide "complete" event if it was the last image
	 * to load.
	 * @param integer index Position in the array "this.options.elements"
	 */
	loadImage: function(imageElement) {
		var image = new Image();

		image.addEvent("error", this.imageEventHandler.bind(this, "error", imageElement));
		image.addEvent("load", this.imageEventHandler.bind(this, "load", imageElement));

		this.concurrentDownloads++;

		var index = this.unloadedElements.indexOf(imageElement);
		this.loadedElements.push(this.unloadedElements.splice(index, 1)[0]);
		this.loadedElementsCoordinates.push(this.unloadedElementsCoordinates.splice(index, 1)[0]);

		// Start loading the image
		image.src = imageElement.getProperty(this.options.dataAttribute);
	},

	imageEventHandler: function(eventName, imageElement) {
		this.concurrentDownloads--;

		// Relay the image event
		this.fireEvent(eventName, imageElement);

		// If this was the last image to load, fire the "complete" event
		if (++this.loadedImagesCount === this.options.elements.length) {
			this.fireEvent("complete");
			return;
		}

		// Queue next image
		var timeoutId = this.loadNextImage.bind(this).delay(this.options.delay);
		this.timeoutIds.push(timeoutId);
	},

	elementIsVisible: function(imageElementCoordinates, containerCoordinates) {
		return imageElementCoordinates.bottom >= containerCoordinates.top
			&& imageElementCoordinates.top <= containerCoordinates.bottom
			&& imageElementCoordinates.right >= containerCoordinates.left
			&& imageElementCoordinates.left <= containerCoordinates.right;
	}
});

// Example usage
window.addEvent("domready", function() {
	// Instantiate image loader. See ImageLoader.options for available options.
	var imageLoader = new ImageLoader({
		elements: $$(".image"),
		maxConcurrentDownloads: 2,
		maxDistance: 400
	});

	imageLoader.addEvent("complete", function() {
		console.log("Loading images completed.");
	});

	imageLoader.addEvent("error", function(element) {
		console.log("Image failed to load: " + element.getProperty(this.options.dataAttribute));
		element.getParent().destroy();
	});

	imageLoader.addEvent("load", function(element) {
		console.log("Image loaded: " + element.getProperty(this.options.dataAttribute));
		element.setProperty("src", element.getProperty(this.options.dataAttribute));
	});

	imageLoader.run();
});
var ImageLoader = new Class({
	Implements: Options,

	options: {
		className: "image",
		delay: 2000,
		foldDistance: 250,
		parallelDownloads: 1
	},

	initialize: function() {
		// Array of "img" elements that contain the images we want to lazy load
		this.imageElements = $$("." + this.options.className);

		// Index of the image that is loaded next
		this.index = 0;
	},

	run: function() {
		// Remove "src" attribute to prevent the browser from loading the images
		for (var i = 0; i < this.imageElements.length; i++) {
			this.imageElements[i].store("src", this.imageElements[i].getProperty("src"));
			this.imageElements[i].removeProperty("src");
		}

		// Load images simultaneously and in order of appearance
		for (var i = 0; i < this.options.parallelDownloads; i++) {
			this.loadNextImage();
		}
	},

	loadNextImage: function() {
		this.loadImage(this.index++);
	},

	loadImage: function(i) {
		if (i >= this.imageElements.length) {
			return;
		}

		var image = new Image();

		image.addEvent("load", function(imageElement) {
			imageElement.setProperty("src", imageElement.retrieve("src"));
			imageElement.eliminate("src");
			this.loadNextImage.bind(this).delay(this.options.delay);
		}.bind(this, this.imageElements[i]));

		image.addEvent("error", function(imageElement) {
			imageElement.eliminate("src");
			this.loadNextImage.bind(this).delay(this.options.delay);
		}.bind(this, this.imageElements[i]));

		// Start loading the image
		image.src = this.imageElements[i].retrieve("src");
	}
});

window.addEvent("domready", function() {
	var imageLoader = new ImageLoader();
	imageLoader.run();
});
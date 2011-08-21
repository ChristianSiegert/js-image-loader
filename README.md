# Optimized image loading

This is a demo of how JavaScript can be used to defer loading images until they become visible on the screen.

## Requirements

* [MooTools Core](http://mootools.net/)

## Browser compatibility

Tested and confirmed working in Chrome 12+, Firefox 6, IE 9 and Opera 11.50. It should work in older browsers, too, but I haven't tested it.

## Example usage

For detailed explanations read the source of the example HTML files.

	<!DOCTYPE html>
	<html>
		<head>
			<meta charset="UTF-8" />
			<title>Example</title>

			<!-- Take a look at the stylesheet. It contains important CSS rules. -->
			<link rel="stylesheet" href="css/general.css">
		</head>

		<!-- Note that we added a class -->
		<body class="no-js">
			<!-- For everyone with Javascript enabled -->
			<ul id="image-list" class="image-list">
				<li class="image-list-item"><img alt="Lorem ipsum" class="image" height="220" data-src="images/a.jpg" src="images/transparent.gif" width="330"></li>
			</ul>

			<!-- For everyone with Javascript disabled -->
			<noscript>
				<ul class="image-list">
					<li class="image-list-item"><img alt="Lorem ipsum" class="image" height="220" src="images/a.jpg" width="330"></li>
				</ul>
			</noscript>
		</body>

		<script src="js/mootools-core-1.3.2-full-nocompat-yc.js"></script>
		<script src="js/image_loader.js"></script>

		<script>
			window.addEvent("domready", function() {
				// Instantiate image loader. See ImageLoader.options for available options.
				var imageLoader = new ImageLoader({
					elements: $$(".image"),
					maxConcurrentDownloads: 2,
					maxDistance: 350
				});

				imageLoader.run();
			});
		</script>
	</html>
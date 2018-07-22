'use strict';

// Ensure that code runs as soon as possible, but no sooner
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    onDocumentInteractive();
} else {
    document.onreadystatechange = function () {
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            document.onreadystatechange = null;
            onDocumentInteractive();
        }
    };
}

function onDocumentInteractive() {
    var citySelect = document.querySelector('.js-city-select');

    if (citySelect instanceof HTMLSelectElement) {
        citySelect.addEventListener(
            'change',
            function () {
                window.location.href = '/cities/' + citySelect.value + '.html';
            },
            false
        );
    }
}

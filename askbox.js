/**
 * AskBox: a simple on-page question submission form.
 *
 * AskBox provides a simple way to allow users to ask questions directly from a webpage.
 * Questions are posted to the configured Slack channel.
 *
 * FIXME -- make the slack integration configurable, which probably means AskBox needs to call an API to get that config from the server
 */
$(function () {

    // default config
    var config = {
        SLACK_URL: "https://hooks.slack.com/services/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",
        channel: "#monitoring-help"
    };

    var trackingRange = null;   // the text selection range, if any

    /**
     * Display and error message
     */
    function showErrorMessage(message) {
        var messageField = $("#message");

        messageField.addClass("error");
        messageField.html(message);
    }

    /**
     * Display a non-error message
     */
    function showNormalMessage(message) {
        var messageField = $("#message");

        messageField.removeClass("error");
        messageField.html(message);
    }

    /**
     * Validate the form values are not empty and display an error if needed
     */
    function validateForm(username, message) {
        if (!username) {
            showErrorMessage("Error: must include a valid Slack username!");
            return false;
        }
        if (!message) {
            showErrorMessage("Error: must include a message to send!");
            return false;
        }

        return true;
    }

    /**
     * Send a message to the slack channel.  The message will include the user specified
     * Slack username, the message they typed, and the website's URL.  If the user
     * has selected some text on the page, we'll add query parameters that AskBox
     * can use to recreate that selection.
     */
    function sendMessage() {
        var slackUsername = $("#slackUsername").val();

        if (slackUsername.indexOf('@') != 0) {
            slackUsername = '@' + slackUsername;
        }

        var slackMessage = $("#slackMessage").val();
        if (validateForm(slackUsername, slackMessage)) {
            showNormalMessage("Sending...");

            var thisUrl = window.location.href;
            // if we have a selection, let's add those params
            if (trackingRange) {
                // capture the details we need to get back to recreate the selection
                var sn = range.startContainer.parentNode.id;
                var en = range.endContainer.parentNode.id;
                var so = range.startOffset;
                var eo = range.endOffset;

                if (thisUrl.indexOf("?") == -1) {
                    thisUrl += "?abSN=" + encodeURI(sn);
                } else {
                    thisUrl += "&abSN=" + encodeURI(sn);
                }

                thisUrl += "&abSO=" + encodeURI(so);
                thisUrl += "&abEN=" + encodeURI(en);
                thisUrl += "&abEO=" + encodeURI(eo);
            }

            var finalMessage = slackUsername + " asks:\n[ " + thisUrl + " ]\n" + slackMessage;
            var json = {
                'text': finalMessage
            };

            $.ajax({
                type: "POST",
                url: config.SLACK_URL,
                processData: false,
                data: JSON.stringify(json),
                success: function (data) {
                    showNormalMessage("Message sent!");
                    toggleAskBox();
                },
                error: function (data) {
                    showErrorMessage("Failed to send message.");
                }
            });

        }
    }

    /**
     * Cancel the message; clear the fields and close the box
     */
    function cancelMessage() {
        toggleAskBox();
    }

    /**
     * Toggle the question box's visibility
     */
    function toggleAskBox(event) {
        if (event) event.preventDefault();

        var buttonDimensions = document.getElementById("askboxButton").getBoundingClientRect();
        var askboxPanel = $("#askboxPanel");
        askboxPanel.css({right: buttonDimensions.width + 20});
        askboxPanel.slideToggle(200, function () {
            if (askboxPanel.is(":visible")) {
                // if the panel just became visible, highlight the selected text
                if (trackingRange) {
                    addHighlights();
                }

                // set focus on the first input element
                $("#slackUsername").focus();

            } else {
                // if the panel just closed, clear the highlights
                clearHighlights();
                if (trackingRange) {
                    console.log("Restoring range");
                    console.log(trackingRange);
                    // if we are tracking a range, make that selection active again
                    var selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(trackingRange);
                }
            }
        });
    }

    /**
     * Add the question mark button to the DOM and wire in the behavior
     */
    function addAskButton() {
        $("body").append("<div id='askboxButton'><img src='css/images/askBoxButton.png' /></div>");
        $("#askboxButton").click(toggleAskBox);
    }

    /**
     * Add the question box to the DOM and wire up any behaviors
     */
    function addAskBox() {
        $("body").append("<div id='askboxPanel'></div>");
        var askboxPanel = $("#askboxPanel");
        askboxPanel.append("<div class='header'>Ask the Monitoring Team</div>");

        var boxBody = $("<div class='boxbody'></div>");
        askboxPanel.append(boxBody);
        boxBody.append("<p>Enter your Slack username and question.  We'll post your question and a link to this page straight to " + config.channel + ".</p>");

        var slackUsername = $("<input id='slackUsername' type='text' placeholder='Enter your Slack username' />");
        boxBody.append(slackUsername);

        var slackMessage = $("<textarea id='slackMessage' placeholder='Enter your question here...'></textarea>");
        boxBody.append(slackMessage);

        var buttonPanel = $("<div id='buttonPanel'></div>");
        boxBody.append(buttonPanel);

        var messageField = $("<div id='message'></div>");
        buttonPanel.append(messageField);

        var sendButton = $("<span id='sendButton' class='formButton glyphicon glyphicon-ok-sign'></span>");
        buttonPanel.append(sendButton);
        sendButton.click(sendMessage);

        var cancelButton = $("<span id='cancelButton' class='formButton glyphicon glyphicon-remove-sign'></span>");
        buttonPanel.append(cancelButton);
        cancelButton.click(cancelMessage);
    }

    /**
     * Select text on the screen.  This is called on load if we've
     * detected query params and so we only have nodes and offsets instead of
     * prebuilt range
     */
    function selectText(startNode, startOffset, endNode, endOffset) {
        var selection = window.getSelection();
        selection.removeAllRanges();

        var newRange = document.createRange();

        // the selections have to be on the text elements inside the node
        var foundStartNode = $("#" + startNode).contents()
            .filter(function () {
                return this.nodeType === 3; // filter for Node.TEXT_NODE
            })[0];
        var foundEndNode = $("#" + endNode).contents()
            .filter(function () {
                return this.nodeType === 3; // filter for Node.TEXT_NODE
            })[0];

        newRange.setStart(foundStartNode, startOffset);
        newRange.setEnd(foundEndNode, endOffset);

        selection.addRange(newRange);
    }

    /**
     * Start making the toggle button track the text selection so the button
     * stays near the selected text, letting the user know they can ask a
     * question about the part they've highlighted.
     */
    function startTrackingSelection(range) {
        trackingRange = range;
        adjustButtonPosition();

        console.log(trackingRange);
    }

    /**
     * Stop making the toggle button track the text selection
     */
    function stopTrackingSelection() {
        $("#askboxButton").css("bottom", "15px");
        trackingRange = null;
    }

    /**
     * Called when page scrolled so we can adjust the button position, but only
     * if we are having the button track the position of selected text.
     */
    function adjustButtonPosition() {
        if (trackingRange) {
            var selectionRect = trackingRange.getClientRects();
            var askboxButton = $("#askboxButton");
            var trackedBottom = selectionRect[selectionRect.length - 1].bottom;
            var newBottom = window.innerHeight - trackedBottom;
            askboxButton.css("bottom", newBottom);
        }
    }

    /**
     * A selection range often spans across elements.  In order to highlight
     * properly, we want to break this down into safe ranges that do not cross
     * element boundaries.
     */
    function getSafeRanges(range) {
        var ancestor = range.commonAncestorContainer;

        // work our way out from the starting container up to the common ancestor
        var startSegments = [];
        if (range.startContainer != ancestor)
            for (var i = range.startContainer; i != ancestor; i = i.parentNode)
                startSegments.push(i);

        var rangeStarts = [];
        if (startSegments.length > 0) for (var i = 0; i < startSegments.length; i++) {
            var segmentChunk = document.createRange();
            if (i) {
                segmentChunk.setStartAfter(startSegments[i - 1]);
                segmentChunk.setEndAfter(startSegments[i].lastChild);
            }
            else {
                segmentChunk.setStart(startSegments[i], range.startOffset);
                segmentChunk.setEndAfter(
                    (startSegments[i].nodeType == Node.TEXT_NODE)
                        ? startSegments[i] : startSegments[i].lastChild
                );
            }
            rangeStarts.push(segmentChunk);
        }

        // work our way out from the ending container up to the common ancestor
        var endSegments = [];
        if (range.endContainer != ancestor)
            for (var i = range.endContainer; i != ancestor; i = i.parentNode)
                endSegments.push(i);

        var rangeEnds = [];
        if (endSegments.length > 0) for (var i = 0; i < endSegments.length; i++) {
            var segmentChunk = document.createRange();
            if (i) {
                segmentChunk.setStartBefore(endSegments[i].firstChild);
                segmentChunk.setEndBefore(endSegments[i - 1]);
            }
            else {
                segmentChunk.setStartBefore(
                    (endSegments[i].nodeType == Node.TEXT_NODE)
                        ? endSegments[i] : endSegments[i].firstChild
                );
                segmentChunk.setEnd(endSegments[i], range.endOffset);
            }
            rangeEnds.unshift(segmentChunk);
        }

        // now we want to deal with the elements that were in the middle
        // between the original starting segment and the ending segment
        var middleChunk = null;
        if ((startSegments.length > 0) && (endSegments.length > 0)) {
            middleChunk = document.createRange();
            middleChunk.setStartAfter(startSegments[startSegments.length - 1]);
            middleChunk.setEndBefore(endSegments[endSegments.length - 1]);
        }
        else {
            // if the selection starts and stops in the same element, return original range
            return [range];
        }

        rangeStarts.push(middleChunk);

        return rangeStarts.concat(rangeEnds);
    }

    /**
     * Add highlights around the current text selection.  Used to visually highlight selected
     * text even if a focus change deselects the text
     */
    function addHighlights() {
        var safeRanges = getSafeRanges(trackingRange);

        for (var i = 0; i < safeRanges.length; i++) {
            window.getSelection().removeAllRanges();

            // if the start and stop points are the same, skip this one
            if (safeRanges[i].collapsed) {
                continue;
            }
            if (safeRanges[i].startContainer.nodeType === 3 || safeRanges[i].endContainer.nodeType === 3) {
                var highlightSpan = document.createElement("span");
                highlightSpan.setAttribute("class", "askboxHighlight");
                safeRanges[i].surroundContents(highlightSpan);
            } else {
                var highlightSpan = document.createElement("div");
                highlightSpan.setAttribute("class", "askboxHighlight");
                safeRanges[i].surroundContents(highlightSpan);
            }
        }
    }

    /**
     * Clear highlight spans that we add for visual reference
     */
    function clearHighlights() {
        $(".askboxHighlight").contents().unwrap();
    }

    /**
     * When the left mouse button is released, see if there is a text selection
     */
    function checkForSelection(event) {
        // if this is a mouse up event on the left button ...
        if (event.which == 1) {
            // if the message panel is already open, user can't change selection
            if ($("#askboxPanel").is(":visible")) {
                return false;
            }

            var range = null;
            try {
                range = window.getSelection().getRangeAt(0);
            } catch (e) {
                // couldn't find a valid text selection, which is fine.  Move on.
                return;
            }

            //// if the selection doesn't start/stop in a text node with an id, stop right here
            //// FIXME -- not sure how often a user can even do the thing I'm protecting against -- investigate!
            //if (
            //    range.startContainer.nodeType != 3 ||
            //    range.endContainer.nodeType != 3 ||
            //    range.startContainer.parentNode.id == "" ||
            //    range.endContainer.parentNode.id == ""
            //) {
            //    stopTrackingSelection();
            //    return;
            //}

            // if the selection start and stop point is the same, we have no selection
            // and can continue
            if (range.startContainer == range.endContainer && range.startOffset == range.endOffset) {
                stopTrackingSelection();
                return;
            }

            if (!range.getClientRects) {
                // we don't have a way to get the client rect so let's just move on
                return;
            }

            startTrackingSelection(range);
        }
    }

    /**
     * In case we got query params of a previous selection, let's recreate
     */
    function recreateSelection() {
        var params = window.location.search.substring(1).split("&");
        var sn, so, en, eo;
        for (var i = 0; i < params.length; i++) {
            var equalIndex = params[i].indexOf("=");
            if (equalIndex == -1) {
                continue;
            }
            var param = params[i].substring(0, equalIndex);
            var value = decodeURI(params[i].substring(equalIndex + 1, params[i].length));

            switch (param) {
                case "abSN":
                    sn = value;
                    break;
                case "abSO":
                    so = value;
                    break;
                case "abEN":
                    en = value;
                    break;
                case "abEO":
                    eo = value;
                    break;
            }
        }

        if (sn && so && en && eo) {
            selectText(sn, so, en, eo);
        }
    }

    /**
     * Add a watcher for various events
     */
    function addEventWatches() {
        // when the mouse button is raised, let's react to the new text selecdtion
        $(".askable").mouseup(checkForSelection);

        // called when the view is scrolled (we may need to move the button)
        $(window).scroll(adjustButtonPosition);
    }

    // load the required font file and AskBox CSS file
    $("head").append($('<link rel="stylesheet" type="text/css" />').attr("href", "https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,600,700,900"));
    $("head").append($('<link rel="stylesheet" type="text/css" />').attr("href", "css/askbox.css"));

    // add our elements to the page
    addAskButton();
    addAskBox();
    addEventWatches();
    recreateSelection();
});
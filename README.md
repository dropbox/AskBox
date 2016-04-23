# Introduction

AskBox is a simple web widget that enables users to ask
questions about page content.  AskBox presents itself as a
small icon on the bottom right of the page, and when clicked
opens up a panel that prompts the user for their Slack username
and their message.  When the user finishes their message, it
will be posted on the configured Slack channel, along with a
link to the page they are on.  If the user had selected text
before opening the panel, that information will also be added
to the URL, and clicking that modified link will re-highlight
the user's selected text.

# Installing

1. To install AskBox, simply copy the contents into the static
folder of your web application.  It is important that the
folder structure be preserved as is.

2. On you page template (or on each page that you want AskBox
to appear), simply import the javascript `askbox.js`.  Be sure
to specify the following required config options are query
parameters:

    * slackurl: the incoming webhook URL for Slack.
    * channel: the Slack channel or user who should get
      messaged.  Be sure to include the `#` or `@` prefix.
    * restrict: (optional) a selector that describes portions
      that should be made selectable (ex: `.askable`).  If you do
      not want to make the entire page selectable, set restrict to
      `false`.



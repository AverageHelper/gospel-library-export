# gospel-library-export

A tool for exporting and viewing notes and marks from [churchofjesuschrist.org](https://churchofjesuschrist.org/notes). This project is designed to provide a read-only viewing experience. Eventually, this project aims to provide a means of downloading and viewing your notes offline in perpetuity, an open alternative to the current walled garden of scripture notes on the Church's platform.

This project works with v3 of the Notes API utilized by the Church of Jesus Christ's website. This project seems to work reliably as of September 2023. If it has stopped working, please [file an issue](https://codeberg.org/AverageHelper/gospel-library-export/issues/new/choose) or [open a pull request](https://codeberg.org/repo/fork/164615).

## Contributing

This project is entirely open-source. Do with it what you will, in keeping with the [GPLv3 license](/LICENSE) under which this project is licensed. If you're willing to help us improve this project, consider [filing an issue](https://codeberg.org/AverageHelper/gospel-library-export/issues/new/choose).

## Usage and Development

The prerequesites for running or developing this project are the same.

### Prerequisites

This project requires [NodeJS](https://nodejs.org/) (version 18.17 or later) and [NPM](https://npmjs.org/). To make sure you have them available on your machine, try running the following command:

```sh
$ node -v && npm -v
v18.17.1
9.6.7
```

### Clone the Repo

Get the code on your local machine:

```sh
$ cd path/to/parent
$ git clone https://codeberg.org/AverageHelper/gospel-library-export.git
$ cd gospel-library-export
```

### Install Dependencies

Install the various packages on which this project depends:

```sh
$ npm ci
```

### Build Source

This project is written in TypeScript, which Node cannot read by default. Before running the project, we must first transpile the source code into plain JavaScript:

```sh
$ npm run build
```

### Run Unit Tests

If you would like to run the automated test suite, whether you're developing for this project or just curious, you may do so at any time:

```sh
$ npm test
```

### Run the project

This is a CLI app. Everything happens in the console:

```sh
$ npm start
```

On first run, the app will create a directory named `data` in the current working directory, then present you with a list of options:

![A screenshot of the Command-Line Interface (CLI). The prompt reads: "What would you like to do? (Use arrow keys)" with options "Download All Notes" and "View Notes Online".](/docs/07-first-run.png)

The following sections describe in detail the use these options:

## Download All Notes

This mode will attempt to download all of your Gospel Library annotations at once into a local `.json` file in the `data` directory. The app will walk you through authenticating with [churchofjesuschrist.org](https://churchofjesuschrist.org/notes), and then will begin to download your annotations. Once this process is complete, you will be presented with a similar menu as before:

![A screenshot of the CLI. The prompt reads: "Found 1 valid archive. What would you like to do? (Use arrow keys)". The menu is the same as before, with a new default option listed first: "View Notes Offline (1 archive)".](/docs/08-menu-after-download.png)

The new "View Notes Offline" menu option will appear on startup whenever there are valid archive files in the `data` directory.

## View Notes Offline or Online

The Notes viewer is similar for both online and offline viewing.

In Online mode, the app will walk you through authenticating with [churchofjesuschrist.org](https://churchofjesuschrist.org/notes), and then present a UI to navigate your note similar to the way you would see them arranged on the website:

![A screenshot of the CLI. The prompt reads: "Select a tab: (Use arrow keys)" with options: "Notes", "Tags", "Notebooks", and "Study Sets"](/docs/01-select-a-tab.png)

You will not be asked to log in when using Offline mode.

In Offline mode, if there are more than one valid annotations archives downloaded, you will be asked to select one before continuing.

As before, you may use your arrow keys to select an option. The following sections describe in detail each of these options:

### Notes

The "Notes" tab will list all of the annotations associated with the account, 50 at a time. For every note that has an associated document, the highlighted portion of that document will be downloaded along with the annotation. Offline annotations will not be redownloaded. Once this has been done for all 50 annotations, the page is presented:

![A screenshot of the CLI. Several steps have taken place. The "Notes" tab has been selected, and then 50 of 10014 annotations were loaded and prepared. The prompt reads: "Select an annotation: (Use arrow keys)". The default option selected is "Return". Below are the titles of several notes, truncated to fit the screen, such as "Why is this section linked to the section on...", "Lesson 7 Class Preparation Material...", "I am no more worthy to be called thy son", "Church Policies and Guidelines", etc.](/docs/02-notes-select-an-annotation.png)

As before, you may use the arrow keys to select one of your annotations. You will then see your annotation displayed as follows:

![A screenshot of the CLI. An annotation was selected entitled "Help thou mine unbelief". The note reads, "Enough faith to ask for more faith. Enough faith to trust that Jesus can do something here. God makes up the whole way; without Him, we cannot ever be "enough". Remember, too, have faith to not be healed, and be okay." Beneath the title and note is a verse, from the New Testament, Mark 9:24, which reads, "And straightway the father of the child cried out, and said with tears, Lord, I believe; help thou mine unbelief." The words "thou mine" are highlighted in hellow and underlined. Included is a link to the verse on churchofjesuschrist.org. The note belongs to no notebooks, but has two tags: "Unbelief" and "Faith". The prompt reads, "Return to Menu?" with a "yes" or "no" option.](/docs/03-view-annotation.png)

The app tries to interpret the highlight information and display it visually, but this is not always reliable. ([Pull requests](https://codeberg.org/repo/fork/164615) are welcome!) Furthermore, there are limits to the colors and shapes that we can render in a CLI. Colored underlines, for example, are represented with a colored background and a thin underscore. Some colors make the underscore near impossible to see.

To remedy this, you will find beneath the text a description of what the highlight _should_ look like, in case our UI got it wrong.

You will also see the note's associated tags and notebooks, if any. To the prompt below, you may answer `y` or press Enter to return to the top of the annotations list, or answer `n` to the prompt to exit.

To compare with the view online:

![A screenshot of the same annotation from before, as shown on churchofjesuschrist.org. The title is shown in bold, and the note contains a paragraph break before the final sentence. The verse is shown as before. The phrase "help thou mine unbelief" is underlined in yellow, whereas the CLI view highlighted only "thou mine". The website includes options to modify the annotation.](/docs/04-view-annotation-online.png)

Selecting the "Parent Directory" (`..`) option will return you to the main menu.

### Tags

The Tags view will list all of your tags, alongside the number of annotations which use them:

![A screenshot of the CLI. The prompt reads, "Select a Tag: (Use arrow keys)" indicating 303 tags to choose from. A few tags are shown, including "Faith" with 219 associated notes, "Unbelief" with 4 notes, "Power of God" with 164 notes, "Priesthood" with 28 notes, and "Parenthood" with 9 notes.](/docs/05-list-tags.png)

Selecting a tag will present a list similar to the main [Notes](#notes) list, this time showing only annotations relevant to the selected tag.

![A screenshot of the CLI. The "Unbelief" tag was selected, and the titles of 4 annotations are listed. The prompt reads, "Select an annotation: (Use arrow keys)".](/docs/06-tag-select-an-annotation.png)

Selecting an annotation will present the same view as before, detailing everything known about that annotation, including an attempt to render the text mark onto the document's content, if any.

As with the [Notes](#notes) tab, selecting the "Parent Directory" (`..`) option will return you to the list of tags. Selecting the option from the tags list will return you to the main menu.

### Notebooks

The Notebooks view will list all of your notebooks, alongside the number of annotations which use them. This is very similar to the [Tags](#tags) view, with one exception:

The "Unassigned Items" default notebook is analogous to the "Unassigned Notes" default notebook shown online. This notebook behaves strangely. There is a bug on the website which causes _every_ note to load when selecting this notebook, despite the number beside the notebook showing a much lower value. In effect, this notebook seems to contain every annotation you have ever made, just like the [Notes](#notes) section does.

Unfortunately, this is a limitation of the API. Because the website makes no effort to do any filtering on the default notebook, I cannot know for sure if there is any way to do so.

Other notebooks will filter their annotations lists as expected.

### Study Sets

This is a new feature to Gospel Library notes. I don't use it, so I have no way of testing it at the API level. If you need this feature, feel free to [open a pull request](https://codeberg.org/repo/fork/164615).

## Exit

If at any time you wish to exit the app, you may use your terminal's normal termination command. On Unix systems, this is usually `Ctrl`+`C`.

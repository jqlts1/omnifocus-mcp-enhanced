Perspective
A Perspective is a view into your OmniFocus database that appears in the perspective list (left-side of window) and whose contents are detailed in the outline (right-side of window).

OmniFocus comes with built-in perspectives (Perspective.BuiltIn class): Flagged, Forecast, Inbox, Nearby, Projects, Review, and Tags; and two transient reference perspectives: Completed and Changed. Custom perspectives (Perspective.Custom class) can be created in OmniFocus Pro.

Perspective Properties
Here are the properties of both the built-in and custom perspective classes:

The Class Properties of the Perspective.BuiltIn class:
Flagged (Perspective.BuiltIn r/o) • The flagged items.

Forecast (Perspective.BuiltIn r/o) • The upcoming due items.

Inbox (Perspective.BuiltIn r/o) • The inbox of tasks.

Nearby (Perspective.BuiltIn r/o) • Nearby items on a map (iOS only).

Projects (Perspective.BuiltIn r/o) • The library of projects.

Review (Perspective.BuiltIn r/o) • The projects needing review.

Search (Perspective.BuiltIn r/o) • A search of the database. This perspective cannot be set, but might be reported if the user is searching.

Tags (Perspective.BuiltIn r/o) • The hierarchy of tags.

all (Array of Perspective.BuiltIn) • An array of all items of this enumeration. THis property is sometimes used when creating Action Forms.

The Instance Properties of the Perspective.BuiltIn class:
name (String r/o) • The localized name of the built in perspective.

The Instance Properties of the Perspective.Custom class:
identifier (String r/o) • The unique identifier for this custom perspective.

name (String r/o) • The name of this custom perspective.

all (Array of Perspective.Custom) • An array of all items of this enumeration. This property is sometimes used when creating Action Forms.

An instance of either the built-in or custom Perspective class is the value of the perspective property of the Window class.

The Perspective Property of a Window



document.windows[0].perspective
//--> [object Perspective.BuiltIn: Inbox]
Get the name of the current perspective:

Name of the Current Perspective



document.windows[0].perspective.name
//--> "Projects"
Change window view to show Inbox perspective:

Change Window to Inbox Perspective

 

document.windows[0].perspective = Perspective.BuiltIn.Inbox
//--> [object Perspective.BuiltIn: Inbox]
Perspectives can also be shown using the OmniFocus URL schema:

omnifocus:///inbox
omnifocus:///flagged
omnifocus:///projects
omnifocus:///tags
Show Projects Perspective

 

URL.fromString("omnifocus:///projects").open()
Custom Perspectives
Custom Perspectives are created by you to display items based upon the filtering parameters you define.

The properties of the Perspective.Custom class:
iconColor (Color or null) • (4.5.2) The Color (Color documentation) that is applied to the perspective icon symbol. (Does not apply when a perspective uses a custom icon.)

identifier (String r/o) • A unique identifying string assigned to the perspective instance. For example: “aS3jYumRtrm”

name (String r/o) • The name of the custom perspective.

all (Array of Perspective.Custom) • An array of all items of this enumeration. This property is sometimes used when creating Action Forms.

Changing Color of Custom Perspective Icon



cp = Perspective.Custom.byName("Executive Summary")
if(cp){cp.iconColor = Color.white}
The Class Functions of the Perspective.Custom class:
byName(name:String) → (Perspective.Custom or null) • A custom perspective with the given name, if one exists. If there are multiple perspectives with the same name, it is not defined which will be returned.

byIdentifier(uuid:String) → (Perspective.Custom or null) • The custom perspective with this identifier, if it exists. There is guaranteed to be at most one perspective with a given identifier.

The Instance Functions of the Perspective.Custom class:
fileWrapper( ) → (FileWrapper) • Returns an archived file wrapper for the custom perspective. The file wrapper’s preferred filename will be the name of the perspective with an appropriate file extension applied. Its contents will include a plist representing the perspective’s settings, along with any image attachments needed to display its icon.

writeFileRepresentationIntoDirectory(parentURL: URL) → (URL) • Writes the perspective’s fileWrapper() within a given parent directory URL, returning the URL of the saved FileWrapper. This function requires sandboxed access to the parent folder; it may be easier to work with the perspective’s fileWrapper(), which can be accessed directly or saved to disk using FileSaver.

Show a Custom Perspective



var p = Perspective.Custom.byName("Fairfield Project")
if(p){document.windows[0].perspective = p}
Showing Custom Perspective using a URL
To display a custom perspective, you may optionally incorporate the built-in URL support of OmniFocus in the script:

Show Custom Perspective



var name = "Fairfield Project"
var urlStr = "omnifocus:///perspective/" + encodeURIComponent(name)
URL.fromString(urlStr).open()
(01) The name of the custom perspective to be shown.

(02) Append a percent-encoded verson of the custom perspective name to URL string targeting the current perspective in the OmniFocus application.

(03) Use the fromString(…) method of the URL class to convert the string into a URL object, and then execute the url by appending the open() function to the result.

Export the Chosen Custom Perspective
Here is an example plug-in that will display a menu of all available custom perspectives, and then the chosen perspective to file on disk.

Export Custom Perspective

  

/*{
	"type": "action",
	"targets": ["omnifocus"],
	"author": "Otto Automator",
	"identifier": "com.omni-automation.of.export-custom-perspective",
	"version": "1.3",
	"description": "Exports the chosen custom perspective to file.",
	"label": "Export Custom Perspective",
	"shortLabel": "Export Perspective",
	"paletteLabel": "Export Perspective",
	"image": "rectangle.split.3x3"
}*/
(() => {
	const action = new PlugIn.Action(async function(selection, sender){
	try {
			perspectives = new Array()
			perspectives = perspectives.concat(Perspective.Custom.all)
			perspectiveNames = perspectives.map(perspective => {
				return perspective.name
			})
			itemIndexes = new Array()
			perspectiveNames.forEach((name, index) => {
				itemIndexes.push(index)
			})

			perspectiveMenu = new Form.Field.Option(
				"perspective", 
				"Perspective", 
				itemIndexes, 
				perspectiveNames, 
				0
			)
			perspectiveMenu.allowsNull = false

			inputForm = new Form()
			inputForm.addField(perspectiveMenu)
			formPrompt = "Custom perspective to export:"
			buttonTitle = "Continue"
			formObject = await inputForm.show(formPrompt,buttonTitle)

			chosenPerspective = perspectives[formObject.values['perspective']]
			wrapper = chosenPerspective.fileWrapper()
			filesaver = new FileSaver()
			savedFileURL = await filesaver.show(wrapper)
		}
		catch(err){
			if(!err.causedByUserCancelling){
				new Alert(err.name, err.message).show()
			}
		}
	});

	action.validate = function(selection, sender){
		return (Perspective.Custom.all.length > 0)
	};
		
	return action;
})();
eMail the Chosen Custom Perspective (3.9)
Here is an example plug-in that will display a menu of all available custom perspectives, and then add the exported perspective file to a new outgoing email message.

eMail Custom Perspective

  

/*{
	"type": "action",
	"targets": ["omnifocus"],
	"author": "Otto Automator",
	"identifier": "com.omni-automation.of.email-custom-perspective",
	"version": "1.0",
	"description": "Creates a new outgoing mail message with the chosen custom perspective.",
	"label": "eMail Custom Perspective",
	"shortLabel": "eMail Perspective",
	"paletteLabel": "eMail Perspective",
}*/
(() => {
	const action = new PlugIn.Action(function(selection, sender){
		// action code
		// selection options: tasks, projects, folders, tags
		
		var perspectives = new Array()
		perspectives = perspectives.concat(Perspective.Custom.all)
		var perspectiveNames = perspectives.map(perspective => {
			return perspective.name
		})
		var itemIndexes = new Array()
		perspectiveNames.forEach((name, index) => {
			itemIndexes.push(index)
		})
		
		var perspectiveMenu = new Form.Field.Option(
			"perspective", 
			"Perspective", 
			itemIndexes, 
			perspectiveNames, 
			0
		)
		perspectiveMenu.allowsNull = false

		var inputForm = new Form()
		inputForm.addField(perspectiveMenu)
		var formPrompt = "Choose the custom perspective to export:"
		var buttonTitle = "Continue"
		var formPromise = inputForm.show(formPrompt,buttonTitle)
		
		formPromise.then(function(formObject){
			var chosenPerspective = perspectives[formObject.values['perspective']]
			var pName = chosenPerspective.name
			var wrapper = chosenPerspective.fileWrapper()
			var email = new Email()
			email.subject = pName + " Perspective"
			email.body = "Here is a copy of my OmniFocus perspective: “" + pName + "”\n\n"
			email.fileWrappers = [wrapper]
			email.generate()
		})

		formPromise.catch(function(err){
			console.error("form cancelled", err.message)
		})	   
	});

	action.validate = function(selection, sender){
		return (Perspective.Custom.all.length > 0)
	};
		
	return action;
})();
Add the Chosen Perspective
Here is the basic script for creating a new tab (macOS) or window (iPadOS) for a specified perspective:

New Tab/Window with Perspective



(async () => {		
	targetPerspective = Perspective.BuiltIn.Projects
	if (Device.current.mac){
		win = await document.newTabOnWindow(document.windows[0])
		win.perspective = targetPerspective
	} else {
		win = await document.newWindow()
		win.perspective = targetPerspective
	}
})().catch(err => console.error(err.message))
And a version where the chosen perspective is added to a new tab or window:

New View with Chosen Perspective

 

(async () => {
	// remove Search
	bPerspectives = Perspective.BuiltIn.all
	idx = bPerspectives.indexOf(Perspective.BuiltIn.Search)
	if (idx > -1) {
	  bPerspectives.splice(idx, 1);
	}
	bPerspectives.sort((a, b) => {
	  var x = a.name;
	  var y = b.name;
	  if (x < y) {return -1;}
	  if (x > y) {return 1;}
	  return 0;
	})
	bpNames = bPerspectives.map(p => p.name)

	cPerspectives = Perspective.Custom.all
	cPerspectives.sort((a, b) => {
	  var x = a.name;
	  var y = b.name;
	  if (x < y) {return -1;}
	  if (x > y) {return 1;}
	  return 0;
	})
	cpNames = cPerspectives.map(p => p.name)
	pNames = bpNames.concat(cpNames)
	itemIndexes = pNames.map((item, index) => index)
	pObjs = bPerspectives.concat(cPerspectives)

	perspectivesMenu = new Form.Field.Option(
		"perspective", 
		"Perspective", 
		itemIndexes, 
		pNames, 
		0
	)

	inputForm = new Form()
	inputForm.addField(perspectivesMenu)
	formPrompt = "Choose perspective to show:"
	buttonTitle = "Continue"
	formObject = await inputForm.show(formPrompt,buttonTitle)
	chosenIndex = formObject.values['perspective']
	chosenPerspective = pNames[chosenIndex]
	perspect = pObjs[chosenIndex]
	
	if (Device.current.mac){
		if(perspect === Perspective.BuiltIn.Nearby){
		 	throw new Error("Nearby not available on macOS")
		}
		var win = await document.newTabOnWindow(document.windows[0])
	} else {
		var win = await document.newWindow()
	}
	win.perspective = perspect
})().catch(err => new Alert(err.name, err.message).show())

Here is an example plug-in that will display a menu of all available perspectives, and then open the chosen perspective in a new tab (macOS) or a new window (iOS and iPadOS).

Screenshot
(⬆ see above ) The Add Chosen Perspective plug-in has no contextual selection requirements so it is available in the Share menu when no elements are selected in the app interface.

Add the Chosen Perspective

  

/*{
	"type": "action",
	"targets": ["omnifocus"],
	"author": "Otto Automator",
	"identifier": "com.omni-automation.of.add-chosen-perspective",
	"version": "1.3",
	"description": "This action will add a new tab (macOS) or window (iPadOS) displaying the chosen perspective. On macOS, the new tab is added after the last tab in the containing window.",
	"label": "Add Chosen Perspective",
	"shortLabel": "Add Perspective",
	"paletteLabel": "Add Perspective",
	"image": "window.shade.open"
}*/
(() => {
	const action = new PlugIn.Action(async function(selection, sender){
		try {		
			perspectives = new Array()
			perspectives = perspectives.concat(Perspective.BuiltIn.all)
			perspectives = perspectives.concat(Perspective.Custom.all)
			perspectiveNames = perspectives.map(perspective => perspective.name)
			itemIndexes = new Array()
			perspectiveNames.forEach((name, index) => {
				itemIndexes.push(index)
			})
			
			perspectiveMenu = new Form.Field.Option(
				"perspective", 
				null, 
				itemIndexes, 
				perspectiveNames, 
				0
			)
			perspectiveMenu.allowsNull = false
			
			itemsAreExpandedCheckbox = new Form.Field.Checkbox(
				"itemsAreExpanded",
				"Items are expanded",
				null
			)		
			
			notesAreExpandedCheckbox = new Form.Field.Checkbox(
				"notesAreExpanded",
				"Notes are displayed",
				null
			)
			
			sidebarVisibilityCheckbox = new Form.Field.Checkbox(
				"sidebarVisibility",
				"Show the Sidebar",
				null
			)		
												
			inspectorVisibilityCheckbox = new Form.Field.Checkbox(
				"inspectorVisibility",
				"Show the Inspector",
				null
			)		

			inputForm = new Form()
			inputForm.addField(perspectiveMenu)
			inputForm.addField(itemsAreExpandedCheckbox)
			inputForm.addField(notesAreExpandedCheckbox)
			inputForm.addField(sidebarVisibilityCheckbox)
			inputForm.addField(inspectorVisibilityCheckbox)
			formPrompt = "Perspective and display options:"
			buttonTitle = "Continue"
			formObject = await inputForm.show(formPrompt, buttonTitle)

			chosenIndex = formObject.values['perspective']
			chosenPerspective = perspectives[chosenIndex]
			
			itemsAreExpanded = formObject.values['itemsAreExpanded']
			notesAreExpanded = formObject.values['notesAreExpanded']
			sidebarVisibility = formObject.values['sidebarVisibility']
			inspectorVisibility = formObject.values['inspectorVisibility']

			var newWindow
			if (Device.current.mac){
				tabs = document.windows[0].tabGroupWindows
				lastTab = tabs[tabs.length - 1]
				win = await document.newTabOnWindow(lastTab)
				tabs = document.windows[0].tabGroupWindows
				lastTab = tabs[tabs.length - 1]
				lastTab.perspective = chosenPerspective
				newWindow = lastTab
			} else {
				win = await document.newWindow()
				win.perspective = chosenPerspective
				newWindow = win
			}
			
			// SHOW|HIDE PANELS
			newWindow.sidebarVisible = sidebarVisibility
			newWindow.inspectorVisible = inspectorVisibility
			// SET VIEW PARAMETERS
			tree = newWindow.content
			// EXPAND|COLLAPSE NODES
			if(itemsAreExpanded === true){
				tree.rootNode.children.forEach(node => node.expand(true))
			} else {
				tree.rootNode.children.forEach(node => node.collapse(true))
			}
			// EXPAND|COLLAPSE NOTES
			if(notesAreExpanded === true){
				tree.rootNode.children.forEach(node => node.expandNote(true))
			} else {
				tree.rootNode.children.forEach(node => node.collapseNote(true))
			}
		}
		catch(err){
			if(!err.causedByUserCancelling){
				new Alert(err.name, err.message).show()
			}
		}
	});

	action.validate = function(selection, sender){
		return true
	};
	
	return action;
})();
    
Adjusting Filter Rules using Omni Automation
Beginning with OmniFocus v4.2 the Perspective.Custom class now has two new instance properties that provide access to the filter rules of custom perspectives:

archivedFilterRules (Object) • For a custom perspective, archivedFilterRules holds a JSON archive representing the perspective’s rules. These rules will be interpreted differently based on the archivedTopLevelFilterAggregation setting.

archivedTopLevelFilterAggregation (String or null) • For a custom perspective, the archivedTopLevelFilterAggregation indicates which aggregation method is being used to interpret the archivedFilterRules: “all”, “any”, or “none”

Using these new properties, you can both access and alter the filtering rules for a custom perspective using Omni Automation:

Getting Rules for Current Custom Perspective



document.windows[0].perspective.archivedTopLevelFilterAggregation
//--> "all"
			
document.windows[0].perspective.archivedFilterRules
//--> [{actionAvailability: "available"}, {actionHasAnyOfTags: ["ni5R6QIk4aO"]}]
Version of the previous script that uses the JSON.stringify() function to display the results in the console as formatted JSON:

Getting Rules for Current Custom Perspective



agg = document.windows[0].perspective.archivedTopLevelFilterAggregation
console.log(agg)

rulesArchive = document.windows[0].perspective.archivedFilterRules
console.log(JSON.stringify(rulesArchive, undefined, 2))
/*
	[
		{
			"actionAvailability": "available"
		},
		{
			"actionHasAnyOfTags": [
				"ni5R6QIk4aO"
			]
		}
	]
*/
An example of Filter Rules
The following script alters the value of the actionAvailability filter while retaining the value of the actionHasAnyOfTags filter:

Changing Rules for Current Custom Perspective



tagID = flattenedTags.byName("Special").id.primaryKey
currentPerspective = document.windows[0].perspective
currentPerspective.archivedFilterRules = [{actionAvailability: "remaining"}, {actionHasAnyOfTags: [tagID]}]
Altered filter rules for current perspective
The following script demonstrates a function that changes just the value of a specific rule in the currently displayed custom perspective:

Changing Value of a Specified Rule



function changeValueForRule(ruleName, ruleValue){
	cp = document.windows[0].perspective
	rulesObjArray = cp.archivedFilterRules
	for (rulesObj of rulesObjArray){
		if (rulesObj.hasOwnProperty(ruleName)){
			rulesObj[ruleName] = ruleValue
			break
		}
	}
	cp.archivedFilterRules = rulesObjArray
}
// Pass the rule and new value to function
changeValueForRule("actionAvailability", "available")
This variation of the previous function will either change the value of the specified rule if the rule exists in the archive, or add the rule with the indicated value if the rule does not currently exist in the archive.

Set Value of a Specified Rule



function setValueForRule(ruleName, ruleValue){
	cp = document.windows[0].perspective
	rulesObjArray = cp.archivedFilterRules
	didChange = false
	for (rulesObj of rulesObjArray){
		if (rulesObj.hasOwnProperty(ruleName)){
			rulesObj[ruleName] = ruleValue
			didChange = true
			console.log("Changing value…")
			break
		}
	}
	if(!didChange){
		console.log("Added rule…")
		obj = new Object()
		obj[ruleName] = ruleValue
		rulesObjArray.push(obj)
	}
	console.log(JSON.stringify(rulesObjArray, undefined, 2))
	cp.archivedFilterRules = rulesObjArray
}
// Pass the rule and new value to function
setValueForRule("actionHasNoProject", true)
Filter Rules and Values
Here are the variations of possible filter rules and their values:

Filter Rules and Values



archivedTopLevelFilterAggregation: "any", "all", "none"

/* AVAILABILITY */
{
	actionAvailability: "firstAvailable" /* "available", "remaining", "completed", "dropped" */
}

/* STATUS */
{
	actionStatus: "due" /* "flagged" */
}

/* HAS A DUE DATE */
{
	actionHasDueDate: true
}

/* HAS A DEFER DATE */
{
	actionHasDeferDate: true
}

/* AN ESTIMATED DURATION */
{
	actionHasDuration: true
}

/* AN ESTIMATED DURATION LESS THAN */
{
	actionWithinDuration: 5 /* 15, 30, 60 */
}

/* ITEM IS A PROJECT */
{
	actionIsProject: true
}

/* ITEM IS A GROUP */
{
	actionIsGroup: true
}

/* ITEM IS A PROJECT OR GROUP */
{
	actionIsProjectOrGroup: true
}

/* ITEM REPEATS */
{
	actionRepeats: true
}

/* DATE FIELD */
{
	actionDateField: "due", /* "defer", "completed", "dropped", "added", "changed" */
	
		/* USE ONE DATE INDICATOR */
		
		/* ON */
		actionDateIsOnDateSpec: {
			dynamic: "TEXT"
		}
		
		/* YESTERDAY */
		actionDateIsYesterday: true
		
		/* TODAY */
		actionDateIsToday: true
		
		/* TOMORROW */
		actionDateIsTomorrow: true
		
		/* IN THE PAST */
		actionDateIsInThePast: {
			relativeBeforeAmount: 000, 
			relativeComponent: "year" /* "month", "week", "day", "hour" */
		}
		
		/* IN THE NEXT */
		actionDateIsInTheNext: {
			relativeAfterAmount: 000, 
			relativeComponent: "year" /* "month", "week", "day", "hour" */
		}
		
		/* BETWEEN */
		actionDateIsAfterDateSpec: {
				dynamic: "TEXT"
			}, 
			actionDateIsBeforeDateSpec: {
				dynamic: "TEXT"
			}
		}
}

/* IS UNTAGGED */
{
	actionIsUntagged: true
}

/* HAS TAG THAT… */
{
	actionHasTagWithStatus: "remaining" /* "onHold", "dropped", "active", "stalled"
}

/* TAGGED WITH ANY OF… */
{
	actionHasAnyOfTags: ["TAG-ID", "TAG-ID", "…"]
}

/* TAGGED WITH ALL OF… */
{
	actionHasAllOfTags: ["TAG-ID", "TAG-ID", "…"]
}

/* IS NOT PROJECT OR GROUP */
{
	actionIsLeaf: true
}

/* IS IN THE INBOX */
{
	actionHasNoProject: true
}

/* IS IN SINGLE ACTIONS LIST */
{
	actionIsInSingleActionsList: true
}

/* HAS A PROJECT THAT… */
{
	actionHasProjectWithStatus: "active" /* "remaining", "onHold", "completed", "dropped", "stalled", "pending"  */
}

/* CONTAINED WITHIN PROJECT OR FOLDER… */
{
	actionWithinFocus: ["OBJ-ID", "OBJ-ID", "…"]
}

/* MATCHES SEARCH TERMS */
{
	actionMatchingSearch: ["PHRASE ONE", "PHRASE TWO", "…"]
}

/* AGGREGATE TYPE */
{
	aggregateType: "any" /* "all", "none" */
}
 
Saving and Restoring Rules Archives (@)
Using this pair of Omni Automation plug-ins, you can save and restore the rules archives of custom plug-ins.

Here's a plug-in that saves the settings archive of the current custom perspective to a specified JSON file:

Save Custom Perspective

  

/*{
	"type": "action",
	"targets": ["omnifocus"],
	"author": "Otto Automator",
	"identifier": "com.omni-automation.of.archive-custom-perspective-to-file",
	"version": "1.0",
	"description": "Saves the settings archive of the current custom perspective to specified JSON file.",
	"label": "Save Custom Perspective",
	"shortLabel": "Save Custom Perspective",
	"paletteLabel": "Save Custom Perspective",
	"image": "square.and.arrow.down.fill"
}*/
(() => {
	const action = new PlugIn.Action(async function(selection, sender){
		try {
			perspective = selection.window.perspective
			archive = {
				"archivedTopLevelFilterAggregation": perspective.archivedTopLevelFilterAggregation,
				"archivedFilterRules": perspective.archivedFilterRules
			}
			archiveString = JSON.stringify(archive)
			perspectiveName = perspective.name
			data = Data.fromString(archiveString)
			wrapper = FileWrapper.withContents(perspectiveName + '.json', data)
			filesaver = new FileSaver()
			urlObj = await filesaver.show(wrapper)
			console.log(urlObj.string)
			urlObj.open()
		}
		catch(err){
			if(!err.causedByUserCancelling){
				console.error(err.name, err.message)
				new Alert(err.name, err.message).show()
			}
		}
	});

	action.validate = function(selection, sender){
		return (document.windows[0].perspective instanceof Perspective.Custom)
	};
	
	return action;
})();
Here’s the matching plug-in that restores the settings archive of the current custom perspective using the contents of the chosen JSON file:

Restore Custom Perspective

  

/*{
	"type": "action",
	"targets": ["omnifocus"],
	"author": "Otto Automator",
	"identifier": "com.omni-automation.of.restore-custom-perspective-from-file",
	"version": "1.1",
	"description": "Restores the settings archive of the current custom perspective using the contents of the chosen JSON file.",
	"label": "Restore Custom Perspective",
	"shortLabel": "Restore Custom Perspective",
	"paletteLabel": "Restore Custom Perspective",
	"image": "square.and.arrow.down.on.square.fill"
}*/
(() => {
	const action = new PlugIn.Action(async function(selection, sender){
		try {
			perspective = selection.window.perspective

			picker = new FilePicker()
			picker.folders = false
			picker.multiple = false
			picker.types = [TypeIdentifier.json]
			urls = await picker.show()

			urls[0].fetch(function(data){
				rulesArchive = JSON.parse(data.toString())
				console.log(JSON.stringify(rulesArchive, undefined, 2))

				perspective.archivedFilterRules = rulesArchive.archivedFilterRules
				perspective.archivedTopLevelFilterAggregation = rulesArchive.archivedTopLevelFilterAggregation

				alertTitle = "Restore Perspective Settings"
				alertMessage = "Perspective settings restored. "
				alertMessage += "You may need to close and reopen "
				alertMessage += "the current perspective to see the changes."
				new Alert(alertTitle, alertMessage).show()
			})
		}
		catch(err){
			if(!err.causedByUserCancelling){
				console.error(err.name, err.message)
				new Alert(err.name, err.message).show()
			}
		}
	});

	action.validate = function(selection, sender){
		return (document.windows[0].perspective instanceof Perspective.Custom)
	};
	
	return action;
})();
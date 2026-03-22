export function buildAppleScriptJsonHelpers(): string {
  return `
on jsonEscape(inputText)
  if inputText is missing value then
    return ""
  end if

  set inputText to inputText as text
  set inputText to my replaceText("\\\\", "\\\\\\\\", inputText)
  set inputText to my replaceText("\\"", "\\\\\\"", inputText)
  set inputText to my replaceText(return, "\\\\n", inputText)
  set inputText to my replaceText(linefeed, "\\\\n", inputText)
  set inputText to my replaceText(tab, "\\\\t", inputText)
  return inputText
end jsonEscape

on replaceText(findText, replacementText, subjectText)
  set previousTextItemDelimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to findText
  set subjectItems to text items of (subjectText as text)
  set AppleScript's text item delimiters to replacementText
  set updatedText to subjectItems as text
  set AppleScript's text item delimiters to previousTextItemDelimiters
  return updatedText
end replaceText
`;
}

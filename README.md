# HN-Tool

HN Tool was originally developed by SAR85.  In his absence JustinS83 has been maintaining the script and adding additional features.

HN Tool provides the ability to show which house numbers have been "nudged" (adjusted by editors) by changing the background color of the house number in the interface to red for house numbers that have not yet been adjusted, and white for ones that have.  Any house numbers that have been updated by you will have a green background.

Additionally, functionality for R4+ has been added which allows the editor to clear all HNs on the segment or adjust all HNs on the segment (that are on screen).  These are useful in situations where the HNs that were originally imported were imported incorrectly and all need to be either cleared or modified.

![](https://imgur.com/phMij7c.png)

The **Adjust house numbers** feature allows the user to enter an amount by which all on screen HNs will be modified. Due to the offset of these possibly varying greatly (some were missing a digit in the front: e.g. - 5306 was imported but the correct HN is 15306, others are missing a trailing digit: e.g. - 5306 was imported by the correct HN is 53060), it is possible to prepend the operator to the HN adjust amount.  

Supported operators: + - / *

Example:

Not entering an operator will function as if "+" was entered.  In the screenshot below, 10000 will be added to the existing HNs changing them from 5434 to 15434.

![](https://imgur.com/dCcXMLQ.png)

Would then become:
![](https://imgur.com/TdH6T5G.png)

Entering "&ast;10" will result in the HNs being multiplied by 10, adding a trailing zero.
![](https://imgur.com/ZLYlRFv.png)

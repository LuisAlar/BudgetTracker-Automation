Transaction made with my debit card are now set up to be tracked. 
getting deposits and money into the acount and other accounts have not been set up yet. 

**The options im thinking to implamen this**
1. gather data 
	- im sure bofa has the option to notify getting money to the account
	- set up zelle , chich i tied to my bofa account still.

would i keep using the same flow in PA for both transaction and depostis or make a new one ? 
same one but there is a condition for trans and depostis . 

one gate triggers one azure function ( parsing transaction )

second ( parsing deposite )

both would take different processes with different logic to extract the info 
- mostly bc emails would look differently --> differnet way to scrape data. 

then once its in json we would expand azure functions to take in + amounts to the budget engine . 

i would like to seprate the tasks needed for this that i can have a better grasp of the steps i would need to keep in mind to validate and itterate to make the architecture more efficent and make it fit my needs. 


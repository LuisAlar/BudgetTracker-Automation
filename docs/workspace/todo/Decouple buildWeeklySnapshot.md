
## bug maybe 
``` typescript 
  

/**

 * Loads budget_config.json from the active Obsidian vault, falling back to defaults if missing.

 */

export async function loadBudgetConfig(vault: Vault): Promise<BudgetConfig> {

    const configPath = "docs/workspace/todo/budget_config.json";

}
```
Im not sure if thepath and json exists . also if it does. this makes it so tha tthe defualy budget confi one is used. 

once i start wanting to tinker with the configs fo the budget ad want to have the json there to be able to update it. 



for the snapshot builder , which conputes the transactions and deposits for  the week, i want to decouple the busniess logic for this porcess to debload the parent function. 

that way i can abstract the steps to get the snapshots and expand if needed later. 
id want different snapshots to be computed and im thinking processes will be similar . abtracting that to resue these processes is my goal. 
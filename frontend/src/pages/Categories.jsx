import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";

function Categories(){

// Categories state
const [categories,setCategories]=useState(()=>{
const saved=localStorage.getItem("categories");
return saved?JSON.parse(saved):["Food","Travel","Shopping","Bills","Entertainment","Other"];
});

// Expenses state (needed to check category usage)
const [expenses,setExpenses]=useState(()=>{
const saved=localStorage.getItem("expenses");
return saved?JSON.parse(saved):[];
});

const [newCategory,setNewCategory]=useState("");

// Save categories to localStorage
useEffect(()=>{
localStorage.setItem("categories",JSON.stringify(categories));
},[categories]);

// Add new category
const addCategory=()=>{

if(!newCategory.trim()) return;

// prevent duplicates
if(categories.includes(newCategory)){
alert("Category already exists");
return;
}

setCategories([...categories,newCategory]);
setNewCategory("");

};

// Delete category (only if not used)
const deleteCategory=(cat)=>{

const used=expenses.some(exp=>exp.category===cat);

if(used){
alert(`Cannot delete "${cat}" because it is used in expenses.`);
return;
}

setCategories(categories.filter(c=>c!==cat));

};

return(

<div className="flex bg-black text-white min-h-screen">

<Sidebar/>

<div className="flex-1 p-10">

<h1 className="text-4xl font-bold text-orange-500 mb-10">
Manage Categories
</h1>

<div className="flex gap-4 mb-8">

<input
type="text"
placeholder="New category"
value={newCategory}
onChange={(e)=>setNewCategory(e.target.value)}
className="bg-gray-800 px-4 py-2 rounded outline-none"
/>

<button
onClick={addCategory}
className="bg-orange-500 px-4 py-2 rounded hover:bg-orange-600"
>
Add
</button>

</div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

{categories.map((cat)=>(

<div
key={cat}
className="bg-gray-900 p-4 rounded-lg flex justify-between items-center"
>

<span>{cat}</span>

<button
onClick={()=>deleteCategory(cat)}
className="text-red-400 hover:text-red-500"
>
Delete
</button>

</div>

))}

</div>

</div>

</div>

);

}

export default Categories;
import App from './App.svelte';
import feather from  "../icons/feather.js";
import "../assets/style.css"
import 'numl';
const app = new App({
	target: document.body,
	props: {
		name: 'world'
	}
});

if(Nude){
  Nude.iconLoader = function iconLoader(name) {
  const data = feather.icons[name];
  const el = document.createElement('svg');
  for (let attr in data.attrs) {
    el.setAttribute(attr, data.attrs[attr]);
  }
  el.innerHTML = data.contents;
  return Promise.resolve(el.outerHTML);
};

	Nude.init()
}

export default app;
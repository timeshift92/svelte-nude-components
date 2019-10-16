<script>
  import { onMount } from "svelte";

  onMount(async () => {
    feather = await import("../icons/feather.js");
    if (Nude) {
      Nude.iconLoader = function iconLoader(name) {
        const data = feather.icons[name];
        const el = document.createElement("svg");
        for (let attr in data.attrs) {
          el.setAttribute(attr, data.attrs[attr]);
        }
        el.innerHTML = data.contents;
        return Promise.resolve(el.outerHTML);
      };

      Nude.init();
    }
  });
  import Modal from "./samples/Modal.svelte";
  import Header from "./components/Header.svelte";
</script>
<nu-flex flow='column'>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<nu-block>sadgasdgasdgasdgasdgasd</nu-block>
<!-- <Header/> -->
<Modal />
<nu-flex
  grow="1"
  width="100%"
  flow="column"
  content="center"
  items="center"
  height="clamp(min-content, 100vh, 42)||auto"
  gap="3|2|1"
  padding="1 2 6||2 1"
  nu-responsive="">
  <nu-card>
    <nu-flex
      grow="1"
      width="100%"
      flow="column"
      content="center"
      items="center"
      height="clamp(min-content, 100vh, 42)||auto"
      gap="3|2|1"
      padding="1 2 6||2 1"
      nu-responsive="">
      <nu-heading
        level="1"
        mod="uppercase"
        size="h1 3|h2 3|h6 2"
        flow="column"
        aria-level="1"
        nu-responsive=""
        role="heading">
        <nu-block>Login</nu-block>

      </nu-heading>
      <nu-block size="lg 2|md 1.5|sm 1.5" nu-responsive="">
        <nu-input type="email" />
        <nu-input type="password" />
        <span data-t="" data-dom-i18n-id="i18n1571128845090767.1726550522397">
          Intuitive&nbsp;performance&nbsp;dashboard,
          advanced&nbsp;expense&nbsp;tracking,
        </span>
        <br />
        <span data-t="" data-dom-i18n-id="i18n1571128845090733.4786950578169">
          in-depth&nbsp;profitability&nbsp;analysis and scenario&nbsp;modeling,
          beautiful&nbsp;profit &amp; loss&nbsp;reporting.
        </span>
        <br />
        <span data-t="" data-dom-i18n-id="i18n1571128845090918.7634683112689">
          Delivered through a gorgeous, blistering-fast&nbsp;interface.
        </span>
      </nu-block>
      <nu-flow padding="1 0 0 0" gap="1">
        <nu-btngroup
          size="lg 2|md||xs"
          inline=""
          nu-responsive=""
          role="radiogroup">
          <nu-input width="20||14|12" padding=".5 1" nu-responsive="">
            <input class="input-field" placeholder="Email" />
          </nu-input>
          <nu-btn
            class="get-started"
            mod="w5"
            data-t=""
            special=""
            role="button"
            aria-pressed="false"
            tabindex="0"
            data-dom-i18n-id="i18n1571128845090710.0063437601907"
            aria-checked="false">
            Get Started
          </nu-btn>
        </nu-btngroup>
        <nu-block
          size="sm"
          data-t=""
          data-dom-i18n-id="i18n1571128845090139.39589138625252">
          We support all North American marketplaces.
        </nu-block>
      </nu-flow>
    </nu-flex>
  </nu-card>
</nu-flex>
</nu-flex>

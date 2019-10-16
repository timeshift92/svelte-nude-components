<style>
  :global(body) {
    min-height: 100vh;
    position: relative;
  }
</style>

<nu-flex flow="column" responsive="960px|700px|375px">
  <nu-theme padding=".5" color="#333" background-color="#fff" special-color="#1885d9" border-color="#d2ddec" shadow-intensity=".2" />
  <nu-theme name="primary" color="#333" background-color="#fff" border-color="#888" special-color="#3297db" shadow-intensity=".2" />
  <nu-theme name="success" color="#00d97e" background-color="#fff" special-color="#00d97e" />
  <nu-theme name="danger" color="#e63757" background-color="#fff" special-color="#e63757" />
  <nu-block t background="center / cover no-repeat url(img/background.jpg)" place="cover" z="back" />
  <nu-block background="rgba(0,0,0,.7)" place="cover" z="-1" shadow />
  <slot>Nothing</slot>

</nu-flex>

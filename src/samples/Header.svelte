<script>
  export let logo = "TScorp";
  export let logoShort = "TS";
  export let menus = [
    {
      id: 1,
      name: "Dashboard",
      icon: "codesandbox",
      url: "dashboard",
      child: [
        {
          name: "Stat",
          url: "stat"
        },
        {
          name: "Overview",
          url: "overview"
        }
      ]
    },
    {
      id: 2,
      name: "Settings",
      icon: "settings",
      url: "/settings"
    }
  ];

  function fistChar(str) {
    var matches = str.match(/\b(\w)/g);
    var acronym = matches.join("");
    return acronym.toUpperCase();
  }
</script>

<slot>
  <nu-flex gap="1" place="cover">
    <nu-mod name="word-wrap">word-break: break-all;</nu-mod>
    <nu-flex
      items="start"
      flow="column"
      width="5% :hover[8%]"
      id="header"
      gap="1|2|3"
      padding="0.25"
      background="">
      <nu-block padding="0 0 0 1">
        {@html logoShort}
        <nu-block display="none #header:hover[inline]">
          {@html logo}
        </nu-block>
      </nu-block>
      <nu-line role="separator" />
      <nu-btngroup
        width="100%"
        value="Overview"
        items="start"
        content="start"
        flow="column"
        gap="1"
        border="0"
        padding="0">
        {#each menus as menu}
          <nu-btn
            display="flex"
            id="asd{menu.id}"
            flow="row"
            width="100%"
            content="start"
            float="left"
            border="0"
            value={menu.name}
            theme="default :pressed[danger] ">
            <nu-icon name={menu.icon} size="1.25" />
            <nu-flex content="space-between" width="100%">
              <nu-block mod="word-wrap" display="none #header:hover[display]">
                {menu.name}
              </nu-block>
              <nu-icon name="chevron-down" size="1.25" />

            </nu-flex>
          </nu-btn>
          {#if menu.child}
            {#each menu.child as item}
              <nu-btn
                padding="0 0 0 1.35"
                size="xs"
                width="100%"
                on:tap={e => true}
                display="none #asd1111111:pressed[flex]"
                flow="row"
                content="start"
                float="left"
                border="0"
                value={item.name}
                theme="default :pressed[danger] ">
                <nu-block mod="word-wrap" display="none #header:hover[display]">
                  {fistChar(item.name)}
                </nu-block>
                <nu-block mod="word-wrap" display="none #header:hover[display]">
                  {item.name}
                </nu-block>
              </nu-btn>
            {/each}
          {/if}
        {/each}
      </nu-btngroup>

    </nu-flex>
  </nu-flex>

</slot>

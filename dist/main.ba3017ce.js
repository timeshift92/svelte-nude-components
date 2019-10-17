var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(html, anchor = null) {
            this.e = element('div');
            this.a = anchor;
            this.u(html);
        }
        m(target, anchor = null) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(target, this.n[i], anchor);
            }
            this.t = target;
        }
        u(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        p(html) {
            this.d();
            this.u(html);
            this.m(this.t, this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /**
     * Emulates forthcoming HMR hooks in Svelte.
     *
     * All references to private compoonent state ($$) are now isolated in this
     * module.
     */

    // NOTE excludes store subscriptions because it causes crashes (and also
    // probably not intented to restore stores states -- stores lives outside of
    // the HMR'd component normally)
    const isWritable = v => !v.module && v.writable && v.name.substr(0, 1) !== '$';

    const isProp = v => isWritable(v) && v.export_name != null;

    // Core $capture_state should be able to capture either only props or the whole
    // local state (i.e. any `let` value). The best behaviour regarding HMR varies
    // between projects, and even situations of what you're currently working on...
    // It's better to leave it as an option to the end user.
    const $capture_state = (cmp, { captureLocalState }) => {
      const compileData = cmp.constructor.$$hmrCompileData;
      if (compileData && compileData.vars) {
        const state = {};
        const filter = captureLocalState ? isWritable : isProp;
        const vars = compileData.vars.filter(filter);
        const ctx = cmp.$$.ctx;
        for (const { name } of vars) {
          state[name] = ctx[name];
        }
        return state
      }
      // fallback on actual $capture_state
      if (cmp.$capture_state) {
        // NOTE the captureLocalState option is fantasy for now
        return cmp.$capture_state({ captureLocalState })
      }
      // else nothing, state won't be used for restore...
    };

    const captureState = (cmp, captureLocalState = true) => {
      // sanity check: propper behaviour here is to crash noisily so that
      // user knows that they're looking at something broken
      if (!cmp) {
        throw new Error('Missing component')
      }
      if (!cmp.$$) {
        throw new Error('Invalid component')
      }
      const {
        $$: { callbacks, bound, ctx: props },
      } = cmp;
      const state = $capture_state(cmp, { captureLocalState });
      return { props, callbacks, bound, state }
    };

    // restoreState
    //
    // It is too late to restore context at this point because component instance
    // function has already been called (and so context has already been read).
    // Instead, we rely on setting current_component to the same value it has when
    // the component was first rendered -- which fix support for context, and is
    // also generally more respectful of normal operation.
    //
    const restoreState = (cmp, restore) => {
      if (!restore) {
        return
      }
      const { callbacks, bound, state } = restore;
      if (callbacks) {
        cmp.$$.callbacks = callbacks;
      }
      if (bound) {
        cmp.$$.bound = bound;
      }
      if (state && cmp.$inject_state) {
        cmp.$inject_state(state);
      }
      // props, props.$$slots are restored at component creation (works
      // better -- well, at all actually)
    };

    const filterProps = (props, { vars }) => {
      if (!vars) {
        return props
      }
      const previousProps = props;
      const result = {};
      vars
        .filter(({ export_name }) => !!export_name)
        .forEach(({ export_name }) => {
          result[export_name] = previousProps[export_name];
        });
      Object.keys(previousProps)
        .filter(name => name.substr(0, 2) === '$$')
        .forEach(key => {
          result[key] = previousProps[key];
        });
      return result
    };

    const createProxiedComponent = (
      Component,
      initialOptions,
      { noPreserveState, onInstance, onMount, onDestroy }
    ) => {
      let cmp;
      let last;
      let parentComponent;
      let compileData;
      let options = initialOptions;

      const isCurrent = _cmp => cmp === _cmp;

      // it's better to restore props from the very beginning -- for example
      // slots (yup, stored in props as $$slots) are broken if not present at
      // component creation and later restored with $set
      const restoreProps = restore => {
        let props = restore && restore.props;
        if (props) {
          // $capture_state is not present in some cases on components. Also, it
          // does not preserves slots. So for now we need fallbacks.
          if (restore.state) {
            return { $$slots: props.$$slots }
          } else {
            if (compileData && compileData.vars) {
              props = filterProps(props, compileData);
            }
            return { props }
          }
        }
      };

      const assignOptions = (target, anchor, restore) =>
        Object.assign(options, { target, anchor }, restoreProps(restore));

      const instrument = targetCmp => {
        const createComponent = (Component, restore, previousCmp) => {
          set_current_component(parentComponent || previousCmp);
          const comp = new Component(options);
          restoreState(comp, restore);
          instrument(comp);
          return comp
        };

        // `conservative: true` means we want to be sure that the new component has
        // actually been successfuly created before destroying the old instance.
        // This could be useful for preventing runtime errors in component init to
        // bring down the whole HMR. Unfortunately the implementation bellow is
        // broken (FIXME), but that remains an interesting target for when HMR hooks
        // will actually land in Svelte itself.
        //
        // The goal would be to render an error inplace in case of error, to avoid
        // losing the navigation stack (especially annoying in native, that is not
        // based on URL navigation, so we lose the current page on each error).
        //
        targetCmp.$replace = (
          Component,
          { target = options.target, anchor = options.anchor, conservative = false }
        ) => {
          compileData = Component.$$hmrCompileData;
          const restore = captureState(targetCmp, !noPreserveState);
          assignOptions(target, anchor, restore);
          const previous = cmp;
          if (conservative) {
            try {
              const next = createComponent(Component, restore, previous);
              // prevents on_destroy from firing on non-final cmp instance
              cmp = null;
              previous.$destroy();
              cmp = next;
            } catch (err) {
              cmp = previous;
              throw err
            }
          } else {
            // prevents on_destroy from firing on non-final cmp instance
            cmp = null;
            if (previous) {
              // previous can be null if last constructor has crashed
              previous.$destroy();
            }
            cmp = createComponent(Component, restore, last);
            last = cmp;
          }
          return cmp
        };

        // NOTE onMount must provide target & anchor (for us to be able to determinate
        // 			actual DOM insertion point)
        if (onMount) {
          const m = targetCmp.$$.fragment.m;
          targetCmp.$$.fragment.m = (...args) => {
            const result = m(...args);
            onMount(...args);
            return result
          };
        }

        // NOTE onDestroy must be called even if the call doesn't pass through the
        //      component's $destroy method (that we can hook onto by ourselves, since
        //      it's public API) -- this happens a lot in svelte's internals, that
        //      manipulates cmp.$$.fragment directly, often binding to fragment.d,
        //      for example
        if (onDestroy) {
          targetCmp.$$.on_destroy.push(() => {
            if (isCurrent(targetCmp)) {
              onDestroy();
            }
          });
        }

        if (onInstance) {
          onInstance(targetCmp);
        }

        // Svelte 3 creates and mount components from their constructor if
        // options.target is present.
        //
        // This means that at this point, the component's `fragment.c` and,
        // most notably, `fragment.m` will already have been called _from inside
        // createComponent_. That is: before we have a chance to hook on it.
        //
        // Proxy's constructor
        //   -> createComponent
        //     -> component constructor
        //       -> component.$$.fragment.c(...) (or l, if hydrate:true)
        //       -> component.$$.fragment.m(...)
        //
        //   -> you are here <-
        //
        if (onMount) {
          const { target, anchor } = options;
          if (target) {
            onMount(target, anchor);
          }
        }
      };

      // NOTE relying on dynamic bindings (current_component) makes us dependent on
      // bundler config (and apparently it does not work in demo-svelte-nollup)
      try {
        parentComponent = get_current_component();
      } catch (err) {
        // that makes us tightly coupled to the error message but, at least, we
        // won't mute an unexpected error, which is quite a horrible thing to do
        if (err.message === 'Function called outside component initialization') {
          // who knows...
          parentComponent = current_component;
        } else {
          throw err
        }
      }

      cmp = new Component(options);

      instrument(cmp);

      return cmp
    };

    const handledMethods = ['constructor', '$destroy'];
    const forwardedMethods = ['$set', '$on'];

    const logError = (...args) => console.error('[HMR][Svelte]', ...args);

    const posixify = file => file.replace(/[/\\]/g, '/');

    const getBaseName = id =>
      id
        .split('/')
        .pop()
        .split('.')
        .slice(0, -1)
        .join('.');

    const capitalize = str => str[0].toUpperCase() + str.slice(1);

    const getFriendlyName = id => capitalize(getBaseName(posixify(id)));

    const getDebugName = id => `<${getFriendlyName(id)}>`;

    const relayCalls = (getTarget, names, dest = {}) => {
      for (const key of names) {
        dest[key] = function(...args) {
          const target = getTarget();
          if (!target) {
            return
          }
          return target[key] && target[key].call(this, ...args)
        };
      }
      return dest
    };

    const copyComponentMethods = (proxy, cmp, debugName) => {
      //proxy custom methods
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(cmp));
      methods.forEach(method => {
        if (
          !handledMethods.includes(method) &&
          !forwardedMethods.includes(method)
        ) {
          proxy[method] = function() {
            if (cmp[method]) {
              return cmp[method].apply(this, arguments)
            } else {
              // we can end up here when calling a method added by a previous
              // version of the component, then removed (but still called
              // somewhere else in the code)
              //
              // TODO we should possibly consider removing all the methods that
              //   have been added by a previous version of the component. This
              //   would be better memory-wise. Not so much so complexity-wise,
              //   though. And for now, we can't survive most runtime errors, so
              //   we will be reloaded often...
              //
              throw new Error(
                `Called to undefined method on ${debugName}: ${method}`
              )
            }
          };
        }
      });
    };

    // everything in the constructor!
    //
    // so we don't polute the component class with new members
    //
    // specificity & conformance with Svelte component constructor is achieved
    // in the "component level" (as opposed "instance level") createRecord
    //
    class ProxyComponent {
      constructor(
        {
          Adapter,
          id,
          debugName,
          current, // { Component, hotOptions: { noPreserveState, ... } }
          register,
          unregister,
          reportError,
        },
        options // { target, anchor, ... }
      ) {
        let cmp;
        let disposed = false;
        let lastError = null;

        const destroyComponent = () => {
          // destroyComponent is tolerant (don't crash on no cmp) because it
          // is possible that reload/rerender is called after a previous
          // createComponent has failed (hence we have a proxy, but no cmp)
          if (cmp) {
            cmp.$destroy();
            cmp = null;
          }
        };

        const refreshComponent = (target, anchor, conservativeDestroy) => {
          if (lastError) {
            lastError = null;
            adapter.rerender();
          } else {
            try {
              if (conservativeDestroy) {
                cmp = cmp.$replace(current.Component, {
                  target,
                  anchor,
                  conservative: true,
                });
              } else {
                cmp = cmp.$replace(current.Component, { target, anchor });
              }
            } catch (err) {
              const errString = String((err && err.stack) || err);
              setError(err);
              if (!current.hotOptions.optimistic || (err && err.hmrFatal)) {
                throw err
              } else {
                logError(`Error during component init ${debugName}: ${errString}`);
              }
            }
          }
        };

        // TODO need to use cmp.$replace
        const setError = (err, target, anchor) => {
          lastError = err;
          adapter.renderError(err);
        };

        const instance = {
          hotOptions: current.hotOptions,
          proxy: this,
          id,
          debugName,
          refreshComponent,
        };

        const adapter = new Adapter(instance);

        const { afterMount, rerender } = adapter;

        // $destroy is not called when a child component is disposed, so we
        // need to hook from fragment.
        const onDestroy = () => {
          // NOTE do NOT call $destroy on the cmp from here; the cmp is already
          //   dead, this would not work
          if (!disposed) {
            disposed = true;
            adapter.dispose();
            unregister();
          }
        };

        // ---- register proxy instance ----

        register(rerender);

        // ---- augmented methods ----

        this.$destroy = () => {
          destroyComponent();
          onDestroy();
        };

        // ---- forwarded methods ----

        const getComponent = () => cmp;

        relayCalls(getComponent, forwardedMethods, this);

        // ---- create & mount target component instance ---

        try {
          cmp = createProxiedComponent(current.Component, options, {
            noPreserveState: current.hotOptions.noPreserveState,
            onDestroy,
            onMount: afterMount,
            onInstance: comp => {
              // WARNING the proxy MUST use the same $$ object as its component
              // instance, because a lot of wiring happens during component
              // initialisation... lots of references to $$ and $$.fragment have
              // already been distributed around when the component constructor
              // returns, before we have a chance to wrap them (and so we can't
              // wrap them no more, because existing references would become
              // invalid)
              this.$$ = comp.$$;
              copyComponentMethods(this, comp);
            },
          });
        } catch (err) {
          setError(err);
          throw err
        }
      }
    }

    const copyStatics = (component, proxy) => {
      //forward static properties and methods
      for (let key in component) {
        proxy[key] = component[key];
      }
    };

    // Creates a proxy object that decorates the original component with trackers
    // and ensures resolution to the latest version of the component
    function createProxy(Adapter, id, Component, hotOptions) {
      let fatalError = false;

      const debugName = getDebugName(id);
      const instances = [];

      // current object will be updated, proxy instances will keep a ref
      const current = {
        Component,
        hotOptions,
      };

      const name = `Proxy${debugName}`;

      // this trick gives the dynamic name Proxy<Component> to the concrete
      // proxy class... unfortunately, this doesn't shows in dev tools, but
      // it stills allow to inspect cmp.constructor.name to confirm an instance
      // is a proxy
      const proxy = {
        [name]: class extends ProxyComponent {
          constructor(options) {
            try {
              super(
                {
                  Adapter,
                  id,
                  debugName,
                  current,
                  register: rerender => {
                    instances.push(rerender);
                  },
                  unregister: () => {
                    const i = instances.indexOf(this);
                    instances.splice(i, 1);
                  },
                },
                options
              );
            } catch (err) {
              // If we fail to create a proxy instance, any instance, that means
              // that we won't be able to fix this instance when it is updated.
              // Recovering to normal state will be impossible. HMR's dead.
              //
              // Fatal error will trigger a full reload on next update (reloading
              // right now is kinda pointless since buggy code still exists).
              //
              fatalError = true;
              logError(
                `Unrecoverable error in ${debugName}: next update will trigger full reload`
              );
              throw err
            }
          }
        },
      }[name];

      // reload all existing instances of this component
      const reload = ({ Component, hotOptions }) => {
        // update current references
        Object.assign(current, { Component, hotOptions });

        // copy statics before doing anything because a static prop/method
        // could be used somewhere in the create/render call
        // TODO delete props/methods previously added and of which value has
        // not changed since
        copyStatics(Component, proxy);

        const errors = [];

        instances.forEach(rerender => {
          try {
            rerender();
          } catch (err) {
            logError(
              `Failed to rerender ${debugName}: ${(err && err.stack) || err}`
            );
            errors.push(err);
          }
        });

        if (errors.length > 0) {
          return false
        }

        return true
      };

      const hasFatalError = () => fatalError;

      return { id, proxy, reload, hasFatalError }
    }

    const defaultHotOptions = {
      noPreserveState: false,
      noReload: false,
      optimistic: false,
    };

    const registry = new Map();

    const domReload = () => {
      if (
        typeof window !== 'undefined' &&
        window.location &&
        window.location.reload
      ) {
        console.log('[HMR][Svelte] Reload');
        window.location.reload();
      } else {
        console.log('[HMR][Svelte] Full reload required');
      }
    };

    // One stop shop for HMR updates. Combines functionality of `configure`,
    // `register`, and `reload`, based on current registry state.
    //
    // Additionaly does whatever it can to avoid crashing on runtime errors,
    // and tries to decline HMR if that doesn't go well.
    //
    function runUpdate({
      id,
      hotOptions,
      Component,
      ProxyAdapter,
      compileData,
    }) {
      // resolve existing record
      let record = registry.get(id);
      let error = null;
      let fatalError = null;

      hotOptions = Object.assign({}, defaultHotOptions, hotOptions);

      // meta info from compilation (vars, things that could be inspected in AST...)
      // can be used to help the proxy better emulate the proxied component (and
      // better mock svelte hooks, in the wait for official support)
      if (compileData) {
        // NOTE we're making Component carry the load to minimize diff with base branch
        Component.$$hmrCompileData = compileData;
      }

      // (re)render
      if (record) {
        if (record.hasFatalError()) {
          fatalError = true;
        } else {
          error = !record.reload({ Component, hotOptions });
        }
      } else {
        record = createProxy(ProxyAdapter, id, Component, hotOptions);
        registry.set(id, record);
      }

      const proxy = record && record.proxy;

      // well, endgame... we won't be able to render next updates, even successful,
      // if we don't have proxies in svelte's tree
      //
      // since we won't return the proxy and the app will expect a svelte component,
      // it's gonna crash... so it's best to report the real cause
      //
      // full reload required
      //
      if (!proxy) {
        throw new Error(`Failed to create HMR proxy for Svelte component ${id}`)
      }

      return { proxy, error, fatalError }
    }

    const logUnrecoverable = id => {
      console.log(
        `[HMR][Svelte] Unrecoverable error in ${id}: next update will trigger full reload`
      );
    };

    function doApplyHmr(args) {
      try {
        const { id, reload = domReload, accept, decline, hotOptions } = args;

        const { proxy, fatalError, error } = runUpdate(args);

        if (fatalError) {
          if (hotOptions && hotOptions.noReload) {
            console.log('[HMR][Svelte] Full reload required');
          } else {
            reload();
          }
        } else if (error) {
          logUnrecoverable(id);
          decline();
        } else {
          accept();
        }

        return proxy
      } catch (err) {
        const { id, decline } = args || {};
        logUnrecoverable(id);
        if (decline) {
          decline();
        }
        // since we won't return the proxy and the app will expect a svelte
        // component, it's gonna crash... so it's best to report the real cause
        throw err
      }
    }

    const declinedModules = (window.__ROLLUP_PLUGIN_SVELTE_HMR_DECLINED_MODULES =
      window.__ROLLUP_PLUGIN_SVELTE_HMR_DECLINED_MODULES || {});

    function applyHmr(args) {
      const { m, id, hotOptions } = args;

      if (declinedModules[id]) {
        declinedModules[id] = false;
        if (!hotOptions.noReload) {
          reload();
        }
      }

      const decline = () => {
        declinedModules[id] = true;
      };

      const accept = () => {
        m.hot.accept(() => require(m.id));
      };

      return doApplyHmr({ ...args, accept, decline })
    }

    var ___SVELTE_HMR_HOT_API = /*#__PURE__*/Object.freeze({
        __proto__: null,
        applyHmr: applyHmr
    });

    const removeElement = el => el && el.parentNode && el.parentNode.removeChild(el);

    const ErrorOverlay = () => {
      let errors = [];
      let compileError = null;

      const errorsTitle = 'Failed to init component';
      const compileErrorTitle = 'Failed to compile';

      const style = {
        section: `
      display: none;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 32px;
      background: rgba(0, 0, 0, .85);
      font-family: Menlo, Consolas, monospace;
      font-size: large;
      color: rgb(232, 232, 232);
      overflow: auto;
    `,
        h1: `
      margin-top: 0;
      color: #E36049;
      font-size: large;
      font-weight: normal;
    `,
        h2: `
      margin: 32px 0 0;
      font-size: large;
      font-weight: normal;
    `,
        pre: ``,
      };

      const createOverlay = () => {
        const h1 = document.createElement('h1');
        h1.style = style.h1;
        const section = document.createElement('section');
        section.appendChild(h1);
        section.style = style.section;
        const body = document.createElement('div');
        section.appendChild(body);
        const target = document.body;
        target.appendChild(section);
        return { h1, el: section, body }
      };

      const setTitle = title => {
        overlay.h1.textContent = title;
      };

      const show = () => {
        overlay.el.style.display = 'block';
      };

      const hide = () => {
        overlay.el.style.display = 'none';
      };

      const update = () => {
        if (compileError) {
          overlay.body.innerHTML = '';
          setTitle(compileErrorTitle);
          const errorEl = renderError(compileError);
          overlay.body.appendChild(errorEl);
          show();
        } else if (errors.length > 0) {
          overlay.body.innerHTML = '';
          setTitle(errorsTitle);
          errors.forEach(({ title, message }) => {
            const errorEl = renderError(message, title);
            overlay.body.appendChild(errorEl);
          });
          show();
        } else {
          hide();
        }
      };

      const renderError = (message, title) => {
        const div = document.createElement('div');
        if (title) {
          const h2 = document.createElement('h2');
          h2.textContent = title;
          h2.style = style.h2;
          div.appendChild(h2);
        }
        const pre = document.createElement('pre');
        pre.textContent = message;
        div.appendChild(pre);
        return div
      };

      const addError = (error, title) => {
        const message = (error && error.stack) || error;
        errors.push({ title, message });
        update();
      };

      const clearErrors = () => {
        errors.forEach(({ element }) => {
          removeElement(element);
        });
        errors = [];
        update();
      };

      const setCompileError = message => {
        compileError = message;
        update();
      };

      const overlay = createOverlay();

      return {
        addError,
        clearErrors,
        setCompileError,
      }
    };

    /* global document */

    const removeElement$1 = el => el && el.parentNode && el.parentNode.removeChild(el);

    class ProxyAdapterDom {
      constructor(instance) {
        this.instance = instance;
        this.insertionPoint = null;

        this.afterMount = this.afterMount.bind(this);
        this.rerender = this.rerender.bind(this);
      }

      // NOTE overlay is only created before being actually shown to help test
      // runner (it won't have to account for error overlay when running assertions
      // about the contents of the rendered page)
      static getErrorOverlay(noCreate = false) {
        if (!noCreate && !this.errorOverlay) {
          this.errorOverlay = ErrorOverlay();
        }
        return this.errorOverlay
      }

      static renderCompileError(message) {
        const noCreate = !message;
        const overlay = this.getErrorOverlay(noCreate);
        if (!overlay) return
        overlay.setCompileError(message);
      }

      dispose() {
        // Component is being destroyed, detaching is not optional in Svelte3's
        // component API, so we can dispose of the insertion point in every case.
        if (this.insertionPoint) {
          removeElement$1(this.insertionPoint);
          this.insertionPoint = null;
        }
        this.clearError();
      }

      // NOTE afterMount CAN be called multiple times (e.g. keyed list)
      afterMount(target, anchor) {
        const {
          instance: { debugName },
        } = this;
        if (!this.insertionPoint) {
          this.insertionPoint = document.createComment(debugName);
        }
        target.insertBefore(this.insertionPoint, anchor);
      }

      rerender() {
        this.clearError();
        const {
          instance: { refreshComponent },
          insertionPoint,
        } = this;
        if (!insertionPoint) {
          const err = new Error('Cannot rerender: Missing insertion point');
          err.hmrFatal = true;
          return err
        }
        refreshComponent(insertionPoint.parentNode, insertionPoint);
      }

      renderError(err) {
        const {
          instance: { debugName },
        } = this;
        const title = debugName || err.moduleName || 'Error';
        this.constructor.getErrorOverlay().addError(err, title);
      }

      clearError() {
        const overlay = this.constructor.getErrorOverlay(true);
        if (!overlay) return
        overlay.clearErrors();
      }
    }

    if (typeof window !== 'undefined') {
      window.__SVELTE_HMR_ADAPTER = ProxyAdapterDom;
    }

    /* src/samples/Header.svelte generated by Svelte v3.12.1 */

    const file = "src/samples/Header.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.menu = list[i];
    	return child_ctx;
    }

    // (55:10) {#if menu.child}
    function create_if_block(ctx) {
    	var each_1_anchor;

    	let each_value_1 = ctx.menu.child;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.menus || changed.fistChar) {
    				each_value_1 = ctx.menu.child;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(each_1_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(55:10) {#if menu.child}", ctx });
    	return block;
    }

    // (56:12) {#each menu.child as item}
    function create_each_block_1(ctx) {
    	var nu_btn, nu_block0, t0_value = fistChar(ctx.item.name) + "", t0, t1, nu_block1, t2_value = ctx.item.name + "", t2, t3, nu_btn_value_value, dispose;

    	const block = {
    		c: function create() {
    			nu_btn = element("nu-btn");
    			nu_block0 = element("nu-block");
    			t0 = text(t0_value);
    			t1 = space();
    			nu_block1 = element("nu-block");
    			t2 = text(t2_value);
    			t3 = space();
    			set_custom_element_data(nu_block0, "mod", "word-wrap");
    			set_custom_element_data(nu_block0, "display", "none #header:hover[display]");
    			add_location(nu_block0, file, 57, 16, 1926);
    			set_custom_element_data(nu_block1, "mod", "word-wrap");
    			set_custom_element_data(nu_block1, "display", "none #header:hover[display]");
    			add_location(nu_block1, file, 58, 16, 2039);
    			set_custom_element_data(nu_btn, "padding", "0 0 0 1.35");
    			set_custom_element_data(nu_btn, "size", "xs");
    			set_custom_element_data(nu_btn, "width", "100%");
    			set_custom_element_data(nu_btn, "display", "flex");
    			set_custom_element_data(nu_btn, "flow", "row");
    			set_custom_element_data(nu_btn, "content", "start");
    			set_custom_element_data(nu_btn, "float", "left");
    			set_custom_element_data(nu_btn, "border", "0");
    			set_custom_element_data(nu_btn, "value", nu_btn_value_value = ctx.item.name);
    			set_custom_element_data(nu_btn, "theme", "default :pressed[danger] ");
    			add_location(nu_btn, file, 56, 14, 1720);
    			dispose = listen_dev(nu_btn, "tap", tap_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_btn, anchor);
    			append_dev(nu_btn, nu_block0);
    			append_dev(nu_block0, t0);
    			append_dev(nu_btn, t1);
    			append_dev(nu_btn, nu_block1);
    			append_dev(nu_block1, t2);
    			append_dev(nu_btn, t3);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.menus) && t0_value !== (t0_value = fistChar(ctx.item.name) + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.menus) && t2_value !== (t2_value = ctx.item.name + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((changed.menus) && nu_btn_value_value !== (nu_btn_value_value = ctx.item.name)) {
    				set_custom_element_data(nu_btn, "value", nu_btn_value_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_btn);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(56:12) {#each menu.child as item}", ctx });
    	return block;
    }

    // (46:8) {#each menus as menu}
    function create_each_block(ctx) {
    	var nu_btn, nu_icon0, nu_icon0_name_value, t0, nu_flex, nu_block, t1_value = ctx.menu.name + "", t1, t2, nu_icon1, nu_btn_value_value, t3, if_block_anchor;

    	var if_block = (ctx.menu.child) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			nu_btn = element("nu-btn");
    			nu_icon0 = element("nu-icon");
    			t0 = space();
    			nu_flex = element("nu-flex");
    			nu_block = element("nu-block");
    			t1 = text(t1_value);
    			t2 = space();
    			nu_icon1 = element("nu-icon");
    			t3 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			set_custom_element_data(nu_icon0, "name", nu_icon0_name_value = ctx.menu.icon);
    			set_custom_element_data(nu_icon0, "size", "1.25");
    			add_location(nu_icon0, file, 47, 12, 1337);
    			set_custom_element_data(nu_block, "mod", "word-wrap");
    			set_custom_element_data(nu_block, "display", "none #header:hover[display]");
    			add_location(nu_block, file, 49, 14, 1451);
    			set_custom_element_data(nu_icon1, "name", "chevron-down");
    			set_custom_element_data(nu_icon1, "size", "1.25");
    			add_location(nu_icon1, file, 50, 14, 1552);
    			set_custom_element_data(nu_flex, "content", "space-between");
    			set_custom_element_data(nu_flex, "width", "100%");
    			add_location(nu_flex, file, 48, 12, 1390);
    			set_custom_element_data(nu_btn, "display", "flex");
    			set_custom_element_data(nu_btn, "flow", "row");
    			set_custom_element_data(nu_btn, "width", "100%");
    			set_custom_element_data(nu_btn, "content", "start");
    			set_custom_element_data(nu_btn, "float", "left");
    			set_custom_element_data(nu_btn, "border", "0");
    			set_custom_element_data(nu_btn, "value", nu_btn_value_value = ctx.menu.name);
    			set_custom_element_data(nu_btn, "theme", "default :pressed[danger] ");
    			add_location(nu_btn, file, 46, 10, 1185);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_btn, anchor);
    			append_dev(nu_btn, nu_icon0);
    			append_dev(nu_btn, t0);
    			append_dev(nu_btn, nu_flex);
    			append_dev(nu_flex, nu_block);
    			append_dev(nu_block, t1);
    			append_dev(nu_flex, t2);
    			append_dev(nu_flex, nu_icon1);
    			insert_dev(target, t3, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.menus) && nu_icon0_name_value !== (nu_icon0_name_value = ctx.menu.icon)) {
    				set_custom_element_data(nu_icon0, "name", nu_icon0_name_value);
    			}

    			if ((changed.menus) && t1_value !== (t1_value = ctx.menu.name + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			if ((changed.menus) && nu_btn_value_value !== (nu_btn_value_value = ctx.menu.name)) {
    				set_custom_element_data(nu_btn, "value", nu_btn_value_value);
    			}

    			if (ctx.menu.child) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_btn);
    				detach_dev(t3);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(46:8) {#each menus as menu}", ctx });
    	return block;
    }

    function create_fragment(ctx) {
    	var nu_flex1, nu_mod, t1, nu_flex0, nu_block1, html_tag, t2, nu_block0, t3, nu_line, t4, nu_btngroup, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	let each_value = ctx.menus;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			if (!default_slot) {
    				nu_flex1 = element("nu-flex");
    				nu_mod = element("nu-mod");
    				nu_mod.textContent = "word-break: break-all;";
    				t1 = space();
    				nu_flex0 = element("nu-flex");
    				nu_block1 = element("nu-block");
    				t2 = space();
    				nu_block0 = element("nu-block");
    				t3 = space();
    				nu_line = element("nu-line");
    				t4 = space();
    				nu_btngroup = element("nu-btngroup");

    				for (let i = 0; i < each_blocks.length; i += 1) {
    					each_blocks[i].c();
    				}
    			}

    			if (default_slot) default_slot.c();
    			if (!default_slot) {
    				set_custom_element_data(nu_mod, "name", "word-wrap");
    				add_location(nu_mod, file, 35, 4, 632);
    				html_tag = new HtmlTag(ctx.logoShort, t2);
    				set_custom_element_data(nu_block0, "display", "none #header:hover[inline]");
    				add_location(nu_block0, file, 39, 8, 875);
    				set_custom_element_data(nu_block1, "padding", "0 0 0 1");
    				add_location(nu_block1, file, 37, 6, 812);
    				set_custom_element_data(nu_line, "role", "separator");
    				add_location(nu_line, file, 43, 6, 990);
    				set_custom_element_data(nu_btngroup, "width", "100%");
    				set_custom_element_data(nu_btngroup, "value", "dashboard");
    				set_custom_element_data(nu_btngroup, "items", "start");
    				set_custom_element_data(nu_btngroup, "content", "start");
    				set_custom_element_data(nu_btngroup, "flow", "column");
    				set_custom_element_data(nu_btngroup, "gap", "1");
    				set_custom_element_data(nu_btngroup, "border", "0");
    				set_custom_element_data(nu_btngroup, "padding", "0");
    				add_location(nu_btngroup, file, 44, 6, 1025);
    				set_custom_element_data(nu_flex0, "items", "start");
    				set_custom_element_data(nu_flex0, "flow", "column");
    				set_custom_element_data(nu_flex0, "width", "5% :hover[8%]");
    				set_custom_element_data(nu_flex0, "id", "header");
    				set_custom_element_data(nu_flex0, "gap", "1|2|3");
    				set_custom_element_data(nu_flex0, "padding", "0.25");
    				set_custom_element_data(nu_flex0, "background", "");
    				add_location(nu_flex0, file, 36, 4, 693);
    				set_custom_element_data(nu_flex1, "gap", "1");
    				set_custom_element_data(nu_flex1, "place", "cover");
    				add_location(nu_flex1, file, 34, 2, 596);
    			}
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (!default_slot) {
    				insert_dev(target, nu_flex1, anchor);
    				append_dev(nu_flex1, nu_mod);
    				append_dev(nu_flex1, t1);
    				append_dev(nu_flex1, nu_flex0);
    				append_dev(nu_flex0, nu_block1);
    				html_tag.m(nu_block1);
    				append_dev(nu_block1, t2);
    				append_dev(nu_block1, nu_block0);
    				nu_block0.innerHTML = ctx.logo;
    				append_dev(nu_flex0, t3);
    				append_dev(nu_flex0, nu_line);
    				append_dev(nu_flex0, t4);
    				append_dev(nu_flex0, nu_btngroup);

    				for (let i = 0; i < each_blocks.length; i += 1) {
    					each_blocks[i].m(nu_btngroup, null);
    				}
    			}

    			else {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!default_slot) {
    				if (!current || changed.logoShort) {
    					html_tag.p(ctx.logoShort);
    				}

    				if (!current || changed.logo) {
    					nu_block0.innerHTML = ctx.logo;
    				}

    				if (changed.menus || changed.fistChar) {
    					each_value = ctx.menus;

    					let i;
    					for (i = 0; i < each_value.length; i += 1) {
    						const child_ctx = get_each_context(ctx, each_value, i);

    						if (each_blocks[i]) {
    							each_blocks[i].p(changed, child_ctx);
    						} else {
    							each_blocks[i] = create_each_block(child_ctx);
    							each_blocks[i].c();
    							each_blocks[i].m(nu_btngroup, null);
    						}
    					}

    					for (; i < each_blocks.length; i += 1) {
    						each_blocks[i].d(1);
    					}
    					each_blocks.length = each_value.length;
    				}
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (!default_slot) {
    				if (detaching) {
    					detach_dev(nu_flex1);
    				}

    				destroy_each(each_blocks, detaching);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function fistChar(str) {
      var matches = str.match(/\b(\w)/g);
      var acronym = matches.join('');
      return acronym.toUpperCase()
    }

    const tap_handler = (e) => true;

    function instance($$self, $$props, $$invalidate) {
    	let { logo = 'TScorp', logoShort = 'TS', menus = [
        {
          name: 'Dashboard',
          icon: 'codesandbox',
          url: 'dashboard',
          child: [
            {
              name: 'Stat',
              url: 'stat',
            },
            {
              name: 'Overview',
              url: 'overview',
            },
          ],
        },
        {
          name: 'Settings',
          icon: 'settings',
          url: '/settings',
        },
      ] } = $$props;

    	const writable_props = ['logo', 'logoShort', 'menus'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('logo' in $$props) $$invalidate('logo', logo = $$props.logo);
    		if ('logoShort' in $$props) $$invalidate('logoShort', logoShort = $$props.logoShort);
    		if ('menus' in $$props) $$invalidate('menus', menus = $$props.menus);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { logo, logoShort, menus };
    	};

    	$$self.$inject_state = $$props => {
    		if ('logo' in $$props) $$invalidate('logo', logo = $$props.logo);
    		if ('logoShort' in $$props) $$invalidate('logoShort', logoShort = $$props.logoShort);
    		if ('menus' in $$props) $$invalidate('menus', menus = $$props.menus);
    	};

    	return { logo, logoShort, menus, $$slots, $$scope };
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["logo", "logoShort", "menus"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Header", options, id: create_fragment.name });
    	}

    	get logo() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set logo(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get logoShort() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set logoShort(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get menus() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set menus(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Header = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/samples/Header.svelte",
    					hotOptions: {},
    					Component: Header,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var Header$1 = Header;

    /* src/components/Header.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/components/Header.svelte";

    function create_fragment$1(ctx) {
    	var nu_card;

    	const block = {
    		c: function create() {
    			nu_card = element("nu-card");
    			nu_card.textContent = "Header";
    			set_custom_element_data(nu_card, "radius", "0");
    			add_location(nu_card, file$1, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_card, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_card);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    class Header$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Header", options, id: create_fragment$1.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Header$2 = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/components/Header.svelte",
    					hotOptions: {},
    					Component: Header$2,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}

    /* src/components/Layout.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/components/Layout.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = 'svelte-dm81jb-style';
    	style.textContent = "body{min-height:100vh;position:relative}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGF5b3V0LnN2ZWx0ZSIsInNvdXJjZXMiOlsiTGF5b3V0LnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3R5bGU+XG4gIDpnbG9iYWwoYm9keSkge1xuICAgIG1pbi1oZWlnaHQ6IDEwMHZoO1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgfVxuPC9zdHlsZT5cblxuPG51LWZsZXggZmxvdz1cImNvbHVtblwiIHJlc3BvbnNpdmU9XCI5NjBweHw3MDBweHwzNzVweFwiPlxuICA8bnUtdGhlbWUgcGFkZGluZz1cIi41XCIgY29sb3I9XCIjMzMzXCIgYmFja2dyb3VuZC1jb2xvcj1cIiNmZmZcIiBzcGVjaWFsLWNvbG9yPVwiIzE4ODVkOVwiIGJvcmRlci1jb2xvcj1cIiNkMmRkZWNcIiBzaGFkb3ctaW50ZW5zaXR5PVwiLjJcIiAvPlxuICA8bnUtdGhlbWUgbmFtZT1cInByaW1hcnlcIiBjb2xvcj1cIiMzMzNcIiBiYWNrZ3JvdW5kLWNvbG9yPVwiI2ZmZlwiIGJvcmRlci1jb2xvcj1cIiM4ODhcIiBzcGVjaWFsLWNvbG9yPVwiIzMyOTdkYlwiIHNoYWRvdy1pbnRlbnNpdHk9XCIuMlwiIC8+XG4gIDxudS10aGVtZSBuYW1lPVwic3VjY2Vzc1wiIGNvbG9yPVwiIzAwZDk3ZVwiIGJhY2tncm91bmQtY29sb3I9XCIjZmZmXCIgc3BlY2lhbC1jb2xvcj1cIiMwMGQ5N2VcIiAvPlxuICA8bnUtdGhlbWUgbmFtZT1cImRhbmdlclwiIGNvbG9yPVwiI2U2Mzc1N1wiIGJhY2tncm91bmQtY29sb3I9XCIjZmZmXCIgc3BlY2lhbC1jb2xvcj1cIiNlNjM3NTdcIiAvPlxuICA8bnUtYmxvY2sgdCBiYWNrZ3JvdW5kPVwiY2VudGVyIC8gY292ZXIgbm8tcmVwZWF0IHVybChpbWcvYmFja2dyb3VuZC5qcGcpXCIgcGxhY2U9XCJjb3ZlclwiIHo9XCJiYWNrXCIgLz5cbiAgPG51LWJsb2NrIGJhY2tncm91bmQ9XCJyZ2JhKDAsMCwwLC43KVwiIHBsYWNlPVwiY292ZXJcIiB6PVwiLTFcIiBzaGFkb3cgLz5cbiAgPHNsb3Q+Tm90aGluZzwvc2xvdD5cblxuPC9udS1mbGV4PlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNVLElBQUksQUFBRSxDQUFDLEFBQ2IsVUFBVSxDQUFFLEtBQUssQ0FDakIsUUFBUSxDQUFFLFFBQVEsQUFDcEIsQ0FBQyJ9 */";
    	append_dev(document.head, style);
    }

    function create_fragment$2(ctx) {
    	var nu_flex, nu_theme0, t0, nu_theme1, t1, nu_theme2, t2, nu_theme3, t3, nu_block0, t4, nu_block1, t5, t6, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			nu_flex = element("nu-flex");
    			nu_theme0 = element("nu-theme");
    			t0 = space();
    			nu_theme1 = element("nu-theme");
    			t1 = space();
    			nu_theme2 = element("nu-theme");
    			t2 = space();
    			nu_theme3 = element("nu-theme");
    			t3 = space();
    			nu_block0 = element("nu-block");
    			t4 = space();
    			nu_block1 = element("nu-block");
    			t5 = space();

    			if (!default_slot) {
    				t6 = text("Nothing");
    			}

    			if (default_slot) default_slot.c();
    			set_custom_element_data(nu_theme0, "padding", ".5");
    			set_custom_element_data(nu_theme0, "color", "#333");
    			set_custom_element_data(nu_theme0, "background-color", "#fff");
    			set_custom_element_data(nu_theme0, "special-color", "#1885d9");
    			set_custom_element_data(nu_theme0, "border-color", "#d2ddec");
    			set_custom_element_data(nu_theme0, "shadow-intensity", ".2");
    			add_location(nu_theme0, file$2, 8, 2, 144);
    			set_custom_element_data(nu_theme1, "name", "primary");
    			set_custom_element_data(nu_theme1, "color", "#333");
    			set_custom_element_data(nu_theme1, "background-color", "#fff");
    			set_custom_element_data(nu_theme1, "border-color", "#888");
    			set_custom_element_data(nu_theme1, "special-color", "#3297db");
    			set_custom_element_data(nu_theme1, "shadow-intensity", ".2");
    			add_location(nu_theme1, file$2, 9, 2, 278);
    			set_custom_element_data(nu_theme2, "name", "success");
    			set_custom_element_data(nu_theme2, "color", "#00d97e");
    			set_custom_element_data(nu_theme2, "background-color", "#fff");
    			set_custom_element_data(nu_theme2, "special-color", "#00d97e");
    			add_location(nu_theme2, file$2, 10, 2, 411);
    			set_custom_element_data(nu_theme3, "name", "danger");
    			set_custom_element_data(nu_theme3, "color", "#e63757");
    			set_custom_element_data(nu_theme3, "background-color", "#fff");
    			set_custom_element_data(nu_theme3, "special-color", "#e63757");
    			add_location(nu_theme3, file$2, 11, 2, 505);
    			set_custom_element_data(nu_block0, "t", "");
    			set_custom_element_data(nu_block0, "background", "center / cover no-repeat url(img/background.jpg)");
    			set_custom_element_data(nu_block0, "place", "cover");
    			set_custom_element_data(nu_block0, "z", "back");
    			add_location(nu_block0, file$2, 12, 2, 598);
    			set_custom_element_data(nu_block1, "background", "rgba(0,0,0,.7)");
    			set_custom_element_data(nu_block1, "place", "cover");
    			set_custom_element_data(nu_block1, "z", "-1");
    			set_custom_element_data(nu_block1, "shadow", "");
    			add_location(nu_block1, file$2, 13, 2, 700);

    			set_custom_element_data(nu_flex, "flow", "column");
    			set_custom_element_data(nu_flex, "responsive", "960px|700px|375px");
    			add_location(nu_flex, file$2, 7, 0, 87);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nu_flex_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_flex, anchor);
    			append_dev(nu_flex, nu_theme0);
    			append_dev(nu_flex, t0);
    			append_dev(nu_flex, nu_theme1);
    			append_dev(nu_flex, t1);
    			append_dev(nu_flex, nu_theme2);
    			append_dev(nu_flex, t2);
    			append_dev(nu_flex, nu_theme3);
    			append_dev(nu_flex, t3);
    			append_dev(nu_flex, nu_block0);
    			append_dev(nu_flex, t4);
    			append_dev(nu_flex, nu_block1);
    			append_dev(nu_flex, t5);

    			if (!default_slot) {
    				append_dev(nu_flex, t6);
    			}

    			else {
    				default_slot.m(nu_flex, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_flex);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { $$slots, $$scope };
    }

    class Layout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-dm81jb-style")) add_css();
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Layout", options, id: create_fragment$2.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Layout = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/components/Layout.svelte",
    					hotOptions: {},
    					Component: Layout,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var Layout$1 = Layout;

    /* src/components/Login.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/components/Login.svelte";

    function create_fragment$3(ctx) {
    	var nu_flex1, nu_card, nu_flex0, nu_heading, nu_block0, t1, nu_icon, t2, nu_block1, t3, nu_flow, nu_input0, input0, t4, nu_input1, input1, t5, nu_block2, t6, nu_block3, t7, nu_btn;

    	const block = {
    		c: function create() {
    			nu_flex1 = element("nu-flex");
    			nu_card = element("nu-card");
    			nu_flex0 = element("nu-flex");
    			nu_heading = element("nu-heading");
    			nu_block0 = element("nu-block");
    			nu_block0.textContent = "Login";
    			t1 = space();
    			nu_icon = element("nu-icon");
    			t2 = space();
    			nu_block1 = element("nu-block");
    			t3 = space();
    			nu_flow = element("nu-flow");
    			nu_input0 = element("nu-input");
    			input0 = element("input");
    			t4 = space();
    			nu_input1 = element("nu-input");
    			input1 = element("input");
    			t5 = space();
    			nu_block2 = element("nu-block");
    			t6 = space();
    			nu_block3 = element("nu-block");
    			t7 = space();
    			nu_btn = element("nu-btn");
    			nu_btn.textContent = "Login";
    			add_location(nu_block0, file$3, 20, 8, 479);
    			set_custom_element_data(nu_heading, "level", "1");
    			set_custom_element_data(nu_heading, "mod", "uppercase");
    			set_custom_element_data(nu_heading, "size", "h1 3|h2 3|h6 2");
    			set_custom_element_data(nu_heading, "flow", "column");
    			add_location(nu_heading, file$3, 19, 6, 396);
    			set_custom_element_data(nu_icon, "name", "gitlab");
    			set_custom_element_data(nu_icon, "size", "5|3|2");
    			add_location(nu_icon, file$3, 22, 6, 532);
    			set_custom_element_data(nu_block1, "size", "lg 2|md 1.5|sm 1.5");
    			add_location(nu_block1, file$3, 24, 6, 578);
    			attr_dev(input0, "name", "login");
    			attr_dev(input0, "placeholder", "Login");
    			add_location(input0, file$3, 27, 10, 721);
    			set_custom_element_data(nu_input0, "width", "20||14|12");
    			set_custom_element_data(nu_input0, "padding", ".5 1");
    			add_location(nu_input0, file$3, 26, 8, 667);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "autocomplete", "new-password");
    			attr_dev(input1, "placeholder", "Password");
    			add_location(input1, file$3, 30, 10, 863);
    			set_custom_element_data(nu_input1, "width", "20||14|12");
    			set_custom_element_data(nu_input1, "padding", ".5 1");
    			set_custom_element_data(nu_input1, "nu-responsive", "");
    			add_location(nu_input1, file$3, 29, 8, 792);
    			set_custom_element_data(nu_block2, "size", "lg 2|md 1.5|sm 1.5");
    			add_location(nu_block2, file$3, 35, 8, 1004);
    			set_custom_element_data(nu_block3, "size", "lg 2|md 1.5|sm 1.5");
    			add_location(nu_block3, file$3, 36, 8, 1051);
    			add_location(nu_btn, file$3, 37, 8, 1098);
    			set_custom_element_data(nu_flow, "padding", "1 0 0 0");
    			set_custom_element_data(nu_flow, "gap", "1");
    			add_location(nu_flow, file$3, 25, 6, 623);
    			set_custom_element_data(nu_flex0, "grow", "1");
    			set_custom_element_data(nu_flex0, "width", "100%");
    			set_custom_element_data(nu_flex0, "flow", "column");
    			set_custom_element_data(nu_flex0, "content", "center");
    			set_custom_element_data(nu_flex0, "items", "center");
    			set_custom_element_data(nu_flex0, "height", "clamp(min-content, 50vh, 42)||auto");
    			set_custom_element_data(nu_flex0, "gap", "1|2|1");
    			set_custom_element_data(nu_flex0, "padding", "1 2 2||2 1");
    			add_location(nu_flex0, file$3, 10, 4, 187);
    			add_location(nu_card, file$3, 9, 2, 173);
    			set_custom_element_data(nu_flex1, "grow", "1");
    			set_custom_element_data(nu_flex1, "width", "100%");
    			set_custom_element_data(nu_flex1, "flow", "column");
    			set_custom_element_data(nu_flex1, "content", "center");
    			set_custom_element_data(nu_flex1, "items", "center");
    			set_custom_element_data(nu_flex1, "height", "clamp(min-content, 50vh, 42)||auto");
    			set_custom_element_data(nu_flex1, "gap", "3|2|1");
    			set_custom_element_data(nu_flex1, "padding", "1 2 6||2 1");
    			add_location(nu_flex1, file$3, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_flex1, anchor);
    			append_dev(nu_flex1, nu_card);
    			append_dev(nu_card, nu_flex0);
    			append_dev(nu_flex0, nu_heading);
    			append_dev(nu_heading, nu_block0);
    			append_dev(nu_flex0, t1);
    			append_dev(nu_flex0, nu_icon);
    			append_dev(nu_flex0, t2);
    			append_dev(nu_flex0, nu_block1);
    			append_dev(nu_flex0, t3);
    			append_dev(nu_flex0, nu_flow);
    			append_dev(nu_flow, nu_input0);
    			append_dev(nu_input0, input0);
    			append_dev(nu_flow, t4);
    			append_dev(nu_flow, nu_input1);
    			append_dev(nu_input1, input1);
    			append_dev(nu_flow, t5);
    			append_dev(nu_flow, nu_block2);
    			append_dev(nu_flow, t6);
    			append_dev(nu_flow, nu_block3);
    			append_dev(nu_flow, t7);
    			append_dev(nu_flow, nu_btn);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_flex1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Login", options, id: create_fragment$3.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Login = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/components/Login.svelte",
    					hotOptions: {},
    					Component: Login,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var Login$1 = Login;

    /* src/components/Modal.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/components/Modal.svelte";

    const get_default_slot_changes = ({ handleClose }) => ({});
    const get_default_slot_context = ({ handleClose }) => ({ handle: handleClose });

    const get_button_slot_changes = ({ handleClose }) => ({});
    const get_button_slot_context = ({ handleClose }) => ({ handle: handleClose });

    // (26:0) {#if showModal}
    function create_if_block$1(ctx) {
    	var nu_block0, t, nu_block1, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			nu_block0 = element("nu-block");
    			t = space();
    			nu_block1 = element("nu-block");

    			if (default_slot) default_slot.c();
    			set_custom_element_data(nu_block0, "background", "rgba(0,0,0,.5)");
    			set_custom_element_data(nu_block0, "place", "cover");
    			set_custom_element_data(nu_block0, "z", "front");
    			set_custom_element_data(nu_block0, "shadow", "");
    			add_location(nu_block0, file$4, 26, 2, 600);

    			set_custom_element_data(nu_block1, "place", "inside fixed");
    			set_custom_element_data(nu_block1, "z", "front");
    			set_custom_element_data(nu_block1, "shadow", "");
    			add_location(nu_block1, file$4, 27, 2, 711);
    			dispose = listen_dev(nu_block0, "click", ctx.click_handler_1);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nu_block1_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_block0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, nu_block1, anchor);

    			if (default_slot) {
    				default_slot.m(nu_block1, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_block0);
    				detach_dev(t);
    				detach_dev(nu_block1);
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(26:0) {#if showModal}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var nu_btn, t0, nu_btn_class_value, dispose_button_slot, t1, if_block_anchor, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	const button_slot_template = ctx.$$slots.button;
    	const button_slot = create_slot(button_slot_template, ctx, get_button_slot_context);

    	var if_block = (ctx.showModal) && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (!button_slot) {
    				nu_btn = element("nu-btn");
    				t0 = text(ctx.buttonName);
    			}

    			if (button_slot) button_slot.c();
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			if (!button_slot) {
    				set_custom_element_data(nu_btn, "class", nu_btn_class_value = "" + ctx.buttonColor + " hover:" + ctx.buttonHover() + " text-white font-bold py-2 px-4 rounded");
    				add_location(nu_btn, file$4, 21, 2, 356);
    				dispose_button_slot = listen_dev(nu_btn, "click", ctx.click_handler);
    			}

    			dispose = listen_dev(window, "resize", ctx.onwindowresize);
    		},

    		l: function claim(nodes) {
    			if (button_slot) button_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (!button_slot) {
    				insert_dev(target, nu_btn, anchor);
    				append_dev(nu_btn, t0);
    			}

    			else {
    				button_slot.m(target, anchor);
    			}

    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!button_slot) {
    				if (!current || changed.buttonName) {
    					set_data_dev(t0, ctx.buttonName);
    				}

    				if ((!current || changed.buttonColor) && nu_btn_class_value !== (nu_btn_class_value = "" + ctx.buttonColor + " hover:" + ctx.buttonHover() + " text-white font-bold py-2 px-4 rounded")) {
    					set_custom_element_data(nu_btn, "class", nu_btn_class_value);
    				}
    			}

    			if (button_slot && button_slot.p && changed.$$scope) {
    				button_slot.p(
    					get_slot_changes(button_slot_template, ctx, changed, get_button_slot_changes),
    					get_slot_context(button_slot_template, ctx, get_button_slot_context)
    				);
    			}

    			if (ctx.showModal) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button_slot, local);
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button_slot, local);
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (!button_slot) {
    				if (detaching) {
    					detach_dev(nu_btn);
    				}

    				dispose_button_slot();
    			}

    			if (button_slot) button_slot.d(detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let showModal = false;
      let { buttonColor = 'bg-blue-500', buttonName = 'Добавить' } = $$props;

      const handleClose = _showModal => {
        $$invalidate('showModal', showModal = _showModal);
      };

      let buttonHover = () => {
        let clr = buttonColor.split('-');
        clr[2] = '700';

        return clr.join('-')
      };

      let height;
      let width;

    	const writable_props = ['buttonColor', 'buttonName'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function onwindowresize() {
    		height = window.innerHeight; $$invalidate('height', height);
    		width = window.innerWidth; $$invalidate('width', width);
    	}

    	const click_handler = () => ($$invalidate('showModal', showModal = true));

    	const click_handler_1 = () => ($$invalidate('showModal', showModal = false));

    	$$self.$set = $$props => {
    		if ('buttonColor' in $$props) $$invalidate('buttonColor', buttonColor = $$props.buttonColor);
    		if ('buttonName' in $$props) $$invalidate('buttonName', buttonName = $$props.buttonName);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { showModal, buttonColor, buttonName, buttonHover, height, width };
    	};

    	$$self.$inject_state = $$props => {
    		if ('showModal' in $$props) $$invalidate('showModal', showModal = $$props.showModal);
    		if ('buttonColor' in $$props) $$invalidate('buttonColor', buttonColor = $$props.buttonColor);
    		if ('buttonName' in $$props) $$invalidate('buttonName', buttonName = $$props.buttonName);
    		if ('buttonHover' in $$props) $$invalidate('buttonHover', buttonHover = $$props.buttonHover);
    		if ('height' in $$props) $$invalidate('height', height = $$props.height);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    	};

    	return {
    		showModal,
    		buttonColor,
    		buttonName,
    		handleClose,
    		buttonHover,
    		height,
    		width,
    		onwindowresize,
    		click_handler,
    		click_handler_1,
    		$$slots,
    		$$scope
    	};
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, ["buttonColor", "buttonName"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Modal", options, id: create_fragment$4.name });
    	}

    	get buttonColor() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttonColor(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get buttonName() {
    		throw new Error("<Modal>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set buttonName(value) {
    		throw new Error("<Modal>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Modal = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/components/Modal.svelte",
    					hotOptions: {},
    					Component: Modal,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var Modal$1 = Modal;

    /* src/samples/Layout.svelte generated by Svelte v3.12.1 */

    // (5:0) <Layout>
    function create_default_slot(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(5:0) <Layout>", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var current;

    	var layout = new Layout$1({
    		props: {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			layout.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(layout, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var layout_changes = {};
    			if (changed.$$scope) layout_changes.$$scope = { changed, ctx };
    			layout.$set(layout_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(layout.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(layout.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(layout, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { $$slots, $$scope };
    }

    class Layout_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Layout_1", options, id: create_fragment$5.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Layout_1 = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/samples/Layout.svelte",
    					hotOptions: {},
    					Component: Layout_1,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var Layout$2 = Layout_1;

    /* src/samples/Login.svelte generated by Svelte v3.12.1 */

    function create_fragment$6(ctx) {
    	var current;

    	var login = new Login$1({ $$inline: true });

    	const block = {
    		c: function create() {
    			login.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    class Login_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Login_1", options, id: create_fragment$6.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Login_1 = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/samples/Login.svelte",
    					hotOptions: {},
    					Component: Login_1,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var Login$2 = Login_1;

    /* src/samples/Modal.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/samples/Modal.svelte";

    // (5:0) <Modal   buttonName="Модальное окно"   buttonColor="bg-green-500"   let:handle={handleClose}>
    function create_default_slot$1(ctx) {
    	var nu_block4, nu_theme0, t0, nu_theme1, t1, nu_card, nu_flex, nu_block0, h1, t3, nu_separator, t4, nu_btn_group0, nu_btn0, t6, nu_btn1, t8, nu_block1, nu_toggle, t9, nu_btn_group1, nu_input, nu_block2, nu_icon, t10, input, t11, nu_block3, t12, nu_btn2, t14, nu_btn3, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	function click_handler_1() {
    		return ctx.click_handler_1(ctx);
    	}

    	const block = {
    		c: function create() {
    			nu_block4 = element("nu-block");
    			nu_theme0 = element("nu-theme");
    			t0 = space();
    			nu_theme1 = element("nu-theme");
    			t1 = space();
    			nu_card = element("nu-card");
    			nu_flex = element("nu-flex");
    			nu_block0 = element("nu-block");
    			h1 = element("h1");
    			h1.textContent = "Header";
    			t3 = space();
    			nu_separator = element("nu-separator");
    			t4 = space();
    			nu_btn_group0 = element("nu-btn-group");
    			nu_btn0 = element("nu-btn");
    			nu_btn0.textContent = "One";
    			t6 = space();
    			nu_btn1 = element("nu-btn");
    			nu_btn1.textContent = "Two";
    			t8 = space();
    			nu_block1 = element("nu-block");
    			nu_toggle = element("nu-toggle");
    			t9 = space();
    			nu_btn_group1 = element("nu-btn-group");
    			nu_input = element("nu-input");
    			nu_block2 = element("nu-block");
    			nu_icon = element("nu-icon");
    			t10 = space();
    			input = element("input");
    			t11 = space();
    			nu_block3 = element("nu-block");
    			t12 = space();
    			nu_btn2 = element("nu-btn");
    			nu_btn2.textContent = "Submit";
    			t14 = space();
    			nu_btn3 = element("nu-btn");
    			nu_btn3.textContent = "Cancel";
    			set_custom_element_data(nu_theme0, "color", "#333");
    			set_custom_element_data(nu_theme0, "background-color", "#fff");
    			set_custom_element_data(nu_theme0, "special-color", "#3366ff");
    			set_custom_element_data(nu_theme0, "border-color", "#fff123");
    			add_location(nu_theme0, file$5, 9, 4, 170);
    			set_custom_element_data(nu_theme1, "name", "primary");
    			set_custom_element_data(nu_theme1, "color", "#1885d9");
    			set_custom_element_data(nu_theme1, "background-color", "#fff");
    			set_custom_element_data(nu_theme1, "special-color", "#1885d9");
    			set_custom_element_data(nu_theme1, "shadow-opacity", ".2");
    			add_location(nu_theme1, file$5, 10, 5, 272);
    			add_location(h1, file$5, 14, 10, 557);
    			add_location(nu_separator, file$5, 15, 10, 583);
    			add_location(nu_block0, file$5, 13, 8, 536);
    			add_location(nu_btn0, file$5, 18, 10, 702);
    			add_location(nu_btn1, file$5, 19, 10, 733);
    			set_custom_element_data(nu_btn_group0, "flow", "column");
    			set_custom_element_data(nu_btn_group0, "radius", "1");
    			set_custom_element_data(nu_btn_group0, "border", "0.25");
    			set_custom_element_data(nu_btn_group0, "theme", "!");
    			add_location(nu_btn_group0, file$5, 17, 8, 628);
    			add_location(nu_toggle, file$5, 22, 10, 823);
    			set_custom_element_data(nu_block1, "theme", "default");
    			add_location(nu_block1, file$5, 21, 8, 786);
    			set_custom_element_data(nu_icon, "name", "gitlab");
    			set_custom_element_data(nu_icon, "size", "1.25");
    			add_location(nu_icon, file$5, 27, 14, 979);
    			set_custom_element_data(nu_block2, "width", "3");
    			add_location(nu_block2, file$5, 26, 12, 944);
    			add_location(input, file$5, 29, 12, 1053);
    			set_custom_element_data(nu_input, "cols", "auto 1fr");
    			set_custom_element_data(nu_input, "items", "center");
    			add_location(nu_input, file$5, 25, 10, 890);
    			set_custom_element_data(nu_block3, "gap", "1");
    			set_custom_element_data(nu_block3, "height", "10px");
    			add_location(nu_block3, file$5, 31, 10, 1095);
    			set_custom_element_data(nu_btn2, "theme", "!primary");
    			set_custom_element_data(nu_btn2, "grow", "0");
    			add_location(nu_btn2, file$5, 32, 10, 1140);
    			set_custom_element_data(nu_btn3, "mod", "transparent");
    			add_location(nu_btn3, file$5, 35, 10, 1255);
    			add_location(nu_btn_group1, file$5, 24, 8, 865);
    			set_custom_element_data(nu_flex, "flow", "column");
    			set_custom_element_data(nu_flex, "padding", "2|2|1");
    			set_custom_element_data(nu_flex, "rows", "repeat(3,1fr)");
    			set_custom_element_data(nu_flex, "cols", "200px");
    			set_custom_element_data(nu_flex, "gap", "1");
    			add_location(nu_flex, file$5, 12, 6, 446);
    			set_custom_element_data(nu_card, "shadow", "");
    			set_custom_element_data(nu_card, "border", "1px");
    			set_custom_element_data(nu_card, "depth", "");
    			set_custom_element_data(nu_card, "theme", "primary");
    			add_location(nu_card, file$5, 11, 4, 388);
    			add_location(nu_block4, file$5, 8, 2, 155);

    			dispose = [
    				listen_dev(nu_btn2, "click", click_handler),
    				listen_dev(nu_btn3, "click", click_handler_1)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nu_block4, anchor);
    			append_dev(nu_block4, nu_theme0);
    			append_dev(nu_block4, t0);
    			append_dev(nu_block4, nu_theme1);
    			append_dev(nu_block4, t1);
    			append_dev(nu_block4, nu_card);
    			append_dev(nu_card, nu_flex);
    			append_dev(nu_flex, nu_block0);
    			append_dev(nu_block0, h1);
    			append_dev(nu_block0, t3);
    			append_dev(nu_block0, nu_separator);
    			append_dev(nu_flex, t4);
    			append_dev(nu_flex, nu_btn_group0);
    			append_dev(nu_btn_group0, nu_btn0);
    			append_dev(nu_btn_group0, t6);
    			append_dev(nu_btn_group0, nu_btn1);
    			append_dev(nu_flex, t8);
    			append_dev(nu_flex, nu_block1);
    			append_dev(nu_block1, nu_toggle);
    			append_dev(nu_flex, t9);
    			append_dev(nu_flex, nu_btn_group1);
    			append_dev(nu_btn_group1, nu_input);
    			append_dev(nu_input, nu_block2);
    			append_dev(nu_block2, nu_icon);
    			append_dev(nu_input, t10);
    			append_dev(nu_input, input);
    			append_dev(nu_btn_group1, t11);
    			append_dev(nu_btn_group1, nu_block3);
    			append_dev(nu_btn_group1, t12);
    			append_dev(nu_btn_group1, nu_btn2);
    			append_dev(nu_btn_group1, t14);
    			append_dev(nu_btn_group1, nu_btn3);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nu_block4);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(5:0) <Modal   buttonName=\"Модальное окно\"   buttonColor=\"bg-green-500\"   let:handle={handleClose}>", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var current;

    	var modal = new Modal$1({
    		props: {
    		buttonName: "Модальное окно",
    		buttonColor: "bg-green-500",
    		$$slots: {
    		default: [create_default_slot$1, ({ handle: handleClose }) => ({ handleClose })]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			modal.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var modal_changes = {};
    			if (changed.$$scope) modal_changes.$$scope = { changed, ctx };
    			modal.$set(modal_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self) {
    	const click_handler = ({ handleClose }) => handleClose();

    	const click_handler_1 = ({ handleClose }) => handleClose(false);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { click_handler, click_handler_1 };
    }

    class Modal_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$7, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Modal_1", options, id: create_fragment$7.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				Modal_1 = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/samples/Modal.svelte",
    					hotOptions: {},
    					Component: Modal_1,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}

    /* src/App.svelte generated by Svelte v3.12.1 */

    // (6:0) <Layout>
    function create_default_slot$2(ctx) {
    	var t, current;

    	var header = new Header$1({ $$inline: true });

    	var login = new Login$2({ $$inline: true });

    	const block = {
    		c: function create() {
    			header.$$.fragment.c();
    			t = space();
    			login.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(login, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);

    			transition_in(login.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(header, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(login, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$2.name, type: "slot", source: "(6:0) <Layout>", ctx });
    	return block;
    }

    function create_fragment$8(ctx) {
    	var current;

    	var layout = new Layout$2({
    		props: {
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			layout.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(layout, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var layout_changes = {};
    			if (changed.$$scope) layout_changes.$$scope = { changed, ctx };
    			layout.$set(layout_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(layout.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(layout.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(layout, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$8.name });
    	}
    }
    			if (typeof module !== 'undefined' && module.hot) {
            const { applyHmr } = ___SVELTE_HMR_HOT_API;
    				App = applyHmr({
    					m: module,
    					id: "/Users/nurbek/Desktop/Projects/svelte-nude-components/src/App.svelte",
    					hotOptions: {},
    					Component: App,
    					ProxyAdapter: ProxyAdapterDom,
    					compileData: null
    				});
    			}
    			var App$1 = App;

    var Nude=function(){var J=Math.min,X=Math.abs,Z=Math.round;function e(e){return new Promise((n,t)=>{const r=document.createElement("script");r.onload=n,r.onerror=t,r.async=!0,r.src=e,document.body.appendChild(r);})}function n(e,n){return t=>{if(null!=t)return t||(t=n),"text"===t?{[e]:"var(--nu-theme-color)"}:re.includes(t)?{[e]:`var(--nu-theme-${t}-color)`}:{[e]:t}}}function t(e,n){if(!e)return e;e.includes("(")||(e=e.replace(/\d+\/\d+/g,e=>{const n=e.split("/");return (100*(+n[0]/+n[1])).toFixed(4)+"%"}).replace(/([\d.]+)([^a-z\d%.]|$)/gi,(e,n,t)=>`${n}rem${t}`)),n&&(e=E(e,"x",n));for(let t of Object.keys(te))e=E(e,t,te[t]);return e}function r(e,{suffix:n,multiplier:r,empty:d,property:o,convert:u}={}){const i=o?"boolean"==typeof o?`--nu-${e}`:o:null,a=`var(${i})`;return n&&o?function(o){return null==o?null:o||d?(o=u?t(o||d,r):o||d,{$suffix:n,[e]:a,[i]:o}):null}:n?function(o){return null==o?null:o||d?(o=u?t(o||d,r):o||d,{$suffix:n,[e]:o}):null}:o?function(n){return null==n?null:n||d?(n=u?t(n||d,r):n||d,{[e]:a,[i]:n}):null}:function(n){return null==n?null:n||d?(n=u?t(n||d,r):n||d,{[e]:n}):null}}function d(e,n){return r=>{if(r){if(r.startsWith("clamp(")){const d=r.slice(6,-1).split(",");return {$suffix:n,[e]:t(d[1]),[`min-${e}`]:t(d[0]),[`max-${e}`]:t(d[2])}}if(r.startsWith("minmax(")){const d=r.slice(7,-1).split(",");return {$suffix:n,[`min-${e}`]:t(d[0]),[`max-${e}`]:t(d[1])}}return r.startsWith("min(")?{$suffix:n,[`min-${e}`]:t(r.slice(4,-1))}:r.startsWith("max(")?{$suffix:n,[`max-${e}`]:t(r.slice(4,-1))}:{$suffix:n,[e]:t(r)}}return r}}function o(e,n){for(const t=[...document.querySelectorAll(n)];(e=e.parentNode)&&!t.includes(e););return e}function u(e,n){const t=e;let r=e;do{const d=[...e.querySelectorAll(n)];if(d){if(d.includes(r)&&r!==t)return r;const e=d.find(e=>e!==t);if(e)return e}r=e;}while(e=e.parentNode)}function i(e,n){return u(e,`[id^="${n}--"], [id="${n}"]`)}function a(...e){}function l(...e){}function s(e){let n=e.id;if(n&&n.includes("--"))return n;n=n||"nu","nu"!==n&&e.setAttribute("nu-id",n),de[n]||(de[n]=0);const t=de[n]+=1;return e.id=`${n}--${t}`,e.id}function c(e,n=!1){if("string"!=typeof e)return null;ue.color="",ue.color=window.HTML_COLORS&&window.HTML_COLORS[e.toLowerCase()]||e;const t=ue.color?ue.color.slice(ue.color.indexOf("(")+1,-1).split(", ").map(Number):null;return t?n?t.slice(0,3):(t[3]=t[3]||1,t):t}function f(e,n=1){const t="string"==typeof e?c(e):e;return t?p(...t.slice(0,3),n):t}function p(e,n,t,r=1){return `rgba(${e}, ${n}, ${t}, ${r})`}function h(e,n=!1){if(!e)return e;const t=c(e,n);return t?p(...t,1):void 0}function m(e,n=0,t=255){const r=c(e);return p(...g(r.map((e,r)=>{if(3===r)return e;return Z((255-e)*(t-n)/t+n)})))}function g(e,n=180){const t="string"==typeof e?c(e):e,r=S(...t);r[0]=(r[0]+n/360)%1;const d=A(...r).concat([t[3]]);return d}function b(e){var n=Math.sqrt;e=c(e,!0).map(e=>e/255);const[t,r,d]=e;return n(.241*(t*t)+.691*(r*r)+.068*(d*d))}function v(e,n,t=.5){const r=c(e,!0),d=c(n,!0),o=r.map((e,n)=>parseInt((d[n]-e)*t+e));return p(o[0],o[1],o[2],1)}function y(e,n){return X(b(e)-b(n))}function x(e){return ue.padding="",ue.padding=e,ue.padding?[ue.paddingTop,ue.paddingRight,ue.paddingBottom,ue.paddingLeft]:null}function k(){this.addEventListener("click",e=>{e.nuHandled||(e.nuHandled=!0,!this.hasAttribute("disabled")&&this.nuTap());}),this.addEventListener("keydown",e=>{this.hasAttribute("disabled")||e.nuHandled||(e.nuHandled=!0,"Enter"===e.key?this.nuTap():" "===e.key&&(e.preventDefault(),this.nuSetMod("active",!0)));}),this.addEventListener("keyup",e=>{this.hasAttribute("disabled")||e.nuHandled||(e.nuHandled=!0," "===e.key&&(e.preventDefault(),this.nuSetMod("active",!1),this.nuTap()));}),this.addEventListener("blur",()=>this.nuSetMod("active",!1)),this.addEventListener("mousedown",()=>{this.nuSetMod("active",!0);}),["mouseleave","mouseup"].forEach(e=>{this.addEventListener(e,()=>{this.nuSetMod("active",!1);});});}function w(e){return e.replace(/\-[a-z]/g,e=>e.slice(1).toUpperCase())}function C(e){return e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`).replace(/^\-/,"")}function S(e,n,t){var o=Math.max;e/=255,n/=255,t/=255;var u,i,a=o(e,n,t),c=J(e,n,t),f=(a+c)/2;if(a==c)u=i=0;else{var l=a-c;i=.5<f?l/(2-a-c):l/(a+c),a===e?u=(n-t)/l+(n<t?6:0):a===n?u=(t-e)/l+2:a===t?u=(e-n)/l+4:void 0,u/=6;}return [u,i,f]}function A(e,n,t){var d,o,u;if(0==n)d=o=u=t;else{function r(e,n,r){return 0>r&&(r+=1),1<r&&(r-=1),r<1/6?e+6*(n-e)*r:r<1/2?n:r<2/3?e+6*((n-e)*(2/3-r)):e}var i=.5>t?t*(1+n):t+n-t*n,a=2*t-i;d=r(a,i,e+1/3),o=r(a,i,e),u=r(a,i,e-1/3);}return [Z(255*d),Z(255*o),Z(255*u)]}function N(e){const n=e.replace(/\^:/g,"#--parent--:").split(/[\s^]+(?=[\:#])/g);let t,r=n.map(n=>{if(n){const r=n.match(/^#([a-z\-]+)/);if(r&&r[1]&&t&&r[1]!==t)return a("too complex state (skipped):",`"${e}"`);t=r?r[1]:null;const d=n.replace(/.*?\:/,"").split(/\[|\]/g);if(1===d.length)return {states:[],parentStates:[],notStates:[],parentNotStates:[],value:n};const o=d[0].split(":");return {states:t?[]:o,parentStates:t?o:[],notStates:[],parentNotStates:[],value:d[1].trim()}}}).filter(e=>e);for(let n=0;n<r.length;n++)for(let e=n+1;e<r.length;e++){const t=r[n],d=r[e];[["states","notStates"],["parentStates","parentNotStates"]].forEach(([e,n])=>{const r=d[e].filter(n=>!t[e].includes(n)),o=t[e].filter(n=>!d[e].includes(n));t[n].push(...r),d[n].push(...o);});}const d="--parent--"===t;return r.map(e=>({$prefix:t&&(e.parentStates.length||e.parentNotStates.length)?(d?"[nu]":`[nu-id="${t}"]`)+e.parentStates.map(e=>ie[e]).join("")+e.parentNotStates.map(e=>`:not(${ie[e]})`).join("")+(d?">":""):null,$suffix:e.states.map(e=>ie[e]).join("")+e.notStates.map(e=>`:not(${ie[e]})`).join(""),value:e.value}))}function T(e,n,t,r){if(null!=n){if(n.match(/[\:\#\^][a-z0-9\-\:]+\[/)){const d=N(n),o=d.reduce((n,d)=>{const o=(T(e,d.value,t,r)||[]).map(e=>(d.$suffix&&(e.$suffix=`${d.$suffix}${e.$suffix||""}`),d.$prefix&&(e.$prefix=`${e.$prefix||""}${d.$prefix}`),e));return o.length&&n.push(...o),n},[]);return o}const d=t[e];if(!d)return null;switch(typeof d){case"string":return n?[{[d]:n}]:null;case"function":const e=d(n,r);return e?Array.isArray(e)?e:[e]:null;default:return null;}}}function E(e,n,t){return e.replace(new RegExp(`[0-9\.]+${n}(?![a-z])`,"gi"),e=>`calc(${t} * ${e.slice(0,-n.length)})`)}function $(e,n){const t=new RegExp(`(^|[^a-z\-])${n}([^a-z\-]|$)`);return e.match(t,"i")}function V(e,n){const t=new RegExp(`(^|[^a-z\-])${n}([^a-z\-]|$)`);return e.match(t,"i")?e.replace(t,e=>e.replace(n,"")).trim():void 0}function R(e){return e?e.split("|").reduce((e,n)=>(N(n).forEach(n=>e.push(n.value)),e),[]):[]}function I(e){oe.innerHTML=e;const n=oe.childNodes[0];return oe.removeChild(n),n}function z(e){ae.push(e),window.postMessage(le,"*");}function L(e,n){e=e||"";const t=document.createElement("style");return n&&(t.dataset.nuName=n),t.appendChild(document.createTextNode(e)),document.head.appendChild(t),t}function M(e){return Object.keys(e).reduce((n,t)=>{const r=e[t];return `${n}${null==r?`:not([${t}])`:`[${t}="${r}"]`}`},"")}function B(e){return Object.keys(e).reduce((n,t)=>`${n}${e[t]?`${t}:${e[t]}`:""};`,"")}function j(e,n,t=""){return n&&n.length?n.map(n=>{let r=e;if(n.$suffix&&(r+=n.$suffix),n.$prefix)if(r.startsWith("#")){const e=r.indexOf(" ");r=`${r.slice(0,e)} ${n.$prefix} ${r.slice(e)}`;}else r=`${n.$prefix} ${r}`;return delete n.$suffix,delete n.$prefix,`${t}${r}{${B(n)}}`}).join("\n"):void 0}function H(e){return e.split(/;/g).map(e=>e.trim()).filter(e=>e).map(e=>e.split(":")).reduce((e,n)=>(e[n[0]]=n[1].trim(),e),{})}function W(e,n,t){const r=L(t,e);if(se[e]){const n=se[e].element;n.parentNode&&n.parentNode.removeChild(n);}return se[e]={selector:n,css:t,element:r},se[e]}function G(e){if(se[e]){const n=se[e].element;n.parentNode.removeChild(n);}}function D(e){return !!se[e]}function O(e,n,t=""){Object.keys(n).forEach(e=>n[e]&&n[e].trim()?void(!n[e].endsWith("!important")&&(n[e]+=" !important")):void delete n[e]),pe[e]=n;const r=`
    ${t} [data-nu-mod="${e}"],
    ${t} [data-nu-mod*=" ${e} "],
    ${t} [data-nu-mod^="${e} "],
    ${t} [data-nu-mod$=" ${e}"],
    ${t} [data-nu-mod-${e}],
    ${t} [nu-mod-${e}],
    ${t} .-nu-${e}
`;W(`mod:${e}:${t}`,r,`${r}{${B(n)}}`);}function P(e){return e.endsWith("-dark")||e.endsWith("-light")}function F(e){return e.replace("-dark","").replace("-light","")}function q(e,n){const t=P(n);return Object.keys(e).reduce((r,d)=>t&&ke.includes(d)?r:(r[d.replace("theme",n)]=e[d],r),{})}function U(e,n,r){const d=h(e.color||r.color),o=h(e.backgroundColor||r.backgroundColor),u=h(e.specialColor||r.specialColor),i=h(e.borderColor||r.borderColor),a={color:d,backgroundColor:o,borderColor:i,specialColor:u,minorColor:h(e.minorColor),minorBackgroundColor:h(e.minorBackgroundColor),borderRadius:t(e.borderRadius||r.borderRadius),padding:t(e.padding||r.padding),borderWidth:t(e.borderWidth||r.borderWidth),shadowColor:h(e.shadowColor||r.shadowColor),specialBackgroundColor:e.specialBackgroundColor,shadowIntensity:e.shadowIntensity||!e.shadowColor&&r.shadowIntensity,focusColor:h(e.focusColor),headingColor:h(e.headingColor),hoverColor:h(e.hoverColor),specialHoverColor:h(e.specialHoverColor),animationTime:e.animationTime||r.animationTime,subtleColor:e.subtleColor};a.specialBackgroundColor=a.specialBackgroundColor||(1.5*y(a.specialColor,a.backgroundColor)>y(a.specialColor,a.color)?a.backgroundColor:a.color);let l;if(b(a.color)<b(a.backgroundColor)){l=Object.keys(a).reduce((e,t)=>(e[t]=ee.includes(C(t))&&a[t]&&"shadowColor"!==t?h(n[t])||m(a[t],32):h(n[t])||a[t],e),{});const e=b(a.specialColor),t=b(l.specialColor);(e<t&&.3<e||e>t&&.3>t)&&Object.assign(l,{specialColor:h(n.specialColor)||a.specialColor}),l.specialBackgroundColor=h(n.specialBackgroundColor)||(1.5*y(l.specialColor,a.backgroundColor)>y(l.specialColor,a.color)?a.backgroundColor:a.color);}else l={...a};return [a,l].map((e,n)=>{Object.assign(e,{shadowIntensity:+(e.shadowIntensity||c(e.shadowColor)[3]),minorColor:e.minorColor||v(v(e.color,e.specialColor,.2),e.backgroundColor,.2),minorBackgroundColor:e.minorBackgroundColor||v(v(e.backgroundColor,e.specialColor,.05),e.color,.05),subtleColor:e.subtleColor||v(v(e.backgroundColor,e.specialColor,.02),e.color,.01),focusColor:e.focusColor||v(e.specialColor,e.backgroundColor),headingColor:e.headingColor||(b(a.backgroundColor)>b(a.color)?v(e.color,e.backgroundColor,.1):e.color),hoverColor:f(e.hoverColor||e.specialColor,.1),specialHoverColor:f(e.specialHoverColor||e.specialBackgroundColor,.075)});const t=J(+e.shadowIntensity,1);return e.shadowOpacity=J(5*(t*(.7-.5*b(e.backgroundColor))),1),e.specialShadowOpacity=J(5*(t*(.7-.5*b(e.specialColor))),1),n&&.9<b(e.specialBackgroundColor)&&(e.specialColor=v(e.specialColor,"rgb(0, 0, 0)",.1),e.specialBackgroundColor=v(e.specialBackgroundColor,"rgb(0, 0, 0)",.1)),e.specialMinorColor=e.specialMinorColor||v(e.specialBackgroundColor,e.specialColor,.2),Object.keys(e).reduce((n,t)=>(n[`--nu-theme-${C(t)}`]=e[t],n),{})})}function K(e,{force:n,cell:t}={}){const r=n?"":`html.nu-focus-enabled `;return `
    ${e} {
      --nu-focus-color: transparent;
      --nu-focus-inset: ${t?"inset":"0 0"};
      --nu-focus-shadow: var(--nu-focus-inset) 0 0.1875rem var(--nu-focus-color);

      outline: none;
    }

    ${r}${e}:not([disabled])::before {
      content: '';
      display: block;
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      pointer-events: none;
      border-radius: var(--nu-border-radius);
      box-shadow: var(--nu-focus-shadow);
      transition: box-shadow var(--nu-theme-animation-time) linear;
    }
    ${r}${e}:not([disabled])[nu-focus] {
      z-index: 10;
    }
    ${r}${e}:not([disabled])[nu-focus] {
      --nu-focus-color: var(--nu-theme-focus-color);
    }
    ${r}${e}:not([disabled])[nu-focus]${t?"":"[cell]"} {
      --nu-focus-inset: inset 0 0;
    }
  `}function Q(e){return we.reduce((n,t)=>{const r=e.getAttribute(t);if(!r)return n;const d=r.split("|");return n.light[w(t)]=d[0],n.dark[w(t)]=d[1],n},{light:{},dark:{}})}function _(){Ln||(Ln=setTimeout(()=>{const e=document.querySelector(ne);e&&e.classList.add("nu-focus-enabled"),Ln=0;},100));}function Y(){Mn||(Mn=setTimeout(()=>{const e=document.querySelector(ne);e&&e.classList.remove("nu-focus-enabled"),Mn=0;},100));}(function(e,n){void 0===n&&(n={});var t=n.insertAt;if(e&&"undefined"!=typeof document){var r=document.head||document.getElementsByTagName("head")[0],d=document.createElement("style");d.type="text/css","top"===t?r.firstChild?r.insertBefore(d,r.firstChild):r.appendChild(d):r.appendChild(d),d.styleSheet?d.styleSheet.cssText=e:d.appendChild(document.createTextNode(e));}})("body{--nu-base:16px;--nu-pixel:1px;--nu-default-border-radius:0.5rem;--nu-default-padding:0.5rem;--nu-default-border-width:1px;--nu-default-animation-time:0.08s;--nu-default-color:#333;--nu-default-background-color:#fff;--nu-default-border-color:#d2ddec;--nu-default-special-color:#1885d9;--nu-default-shadow-color:rgba(0,0,0,0.2);--nu-default-special-background-color:#fff;--nu-default-shadow-intensity:0.2;--nu-default-shadow-opacity:0.1;--nu-default-focus-color:#8bc2ec;--nu-default-heading-color:#474747;--nu-default-hover-color:rgba(24,133,217,0.1);--nu-default-special-hover-color:hsla(0,0%,100%,0.1);--nu-default-special-shadow-opacity:0.35538111934997146;--nu-theme-border-radius:var(--nu-default-border-radius);--nu-theme-padding:var(--nu-default-padding);--nu-theme-border-width:var(--nu-default-border-width);--nu-theme-animation-time:var(--nu-default-animation-time);--nu-theme-color:var(--nu-default-color);--nu-theme-background-color:var(--nu-default-background-color);--nu-theme-border-color:var(--nu-default-border-color);--nu-theme-special-color:var(--nu-default-special-color);--nu-theme-shadow-color:var(--nu-default-shadow-color);--nu-theme-special-background-color:var(--nu-default-special-background-color);--nu-theme-shadow-intensity:var(--nu-default-shadow-intensity);--nu-theme-shadow-opacity:var(--nu-default-shadow-opacity);--nu-theme-focus-color:var(--nu-default-focus-color);--nu-theme-heading-color:var(--nu-default-heading-color);--nu-theme-hover-color:var(--nu-default-hover-color);--nu-theme-special-hover-color:var(--nu-default-special-hover-color);--nu-theme-special-shadow-opacity:var(--nu-default-special-shadow-opacity)}body:not(.nu-prevent-defaults){line-height:1}body:not(.nu-prevent-defaults)>:not([size]){line-height:1.5}.nu-defaults,body:not(.nu-prevent-defaults){margin:0;padding:0;font-family:Avenir Next,Avenir,Helvetica,Ubuntu,DejaVu Sans,Arial,sans-serif;font-size:var(--nu-base);color:var(--nu-theme-color);background:var(--nu-theme-background-color);font-weight:400;word-spacing:.125rem;min-height:100vh;text-align:left;text-size-adjust:none}.nu-defaults:not(body){line-height:1.5}[nu-hidden]{display:none!important}html.nu-prefers-contrast-high.nu-prefers-color-scheme-dark body{filter:invert(100%) brightness(.666) contrast(1.5) brightness(1.5) invert(100%)}@media (prefers-color-scheme:dark){html.nu-prefers-color-scheme body{background:#202020}html.nu-prefers-color-scheme .nu-dark-invert{filter:invert(100%) hue-rotate(180deg)}html.nu-prefers-color-scheme .nu-dark-dim{filter:invert(5%)}html.nu-prefers-contrast-high.nu-prefers-color-scheme body{filter:invert(100%) brightness(.666) contrast(1.5) brightness(1.5) invert(100%)}}@media (prefers-color-scheme:light){html.nu-prefers-contrast-high.nu-prefers-color-scheme body{filter:brightness(.5) contrast(1.5) brightness(2)}}html.nu-prefers-contrast-high:not(.nu-prefers-color-scheme):not(.nu-prefers-color-scheme-dark) body{filter:brightness(.5) contrast(1.5) brightness(2)}html.nu-prefers-color-scheme-dark body{background:#2b2b2b}html.nu-prefers-color-scheme-dark .nu-dark-invert{filter:invert(95%) hue-rotate(180deg)}html.nu-prefers-color-scheme-dark .nu-dark-dim{filter:invert(5%)}@media (prefers-reduced-motion:reduce){.nu-prefers-reduced-motion [nu-themes],.nu-prefers-reduced-motion [theme]{--nu-theme-animation-time:0.001s}}.nu-prefers-reduced-motion-reduce [nu-themes],.nu-prefers-reduced-motion-reduce [theme]{--nu-theme-animation-time:0.001s!important}");const ee=["color","background-color","special-color","border-color","shadow-color","heading-color","hover-color","special-hover-color","special-background-color","focus-color","minor-color","minor-background-color","special-minor-color","subtle-color"],ne="html",te={br:"var(--nu-theme-border-radius)",bw:"var(--nu-theme-border-width)",p:"var(--nu-theme-padding)"},re=[...ee].map(e=>e.replace("-color","")),de={},oe=document.createElement("div"),ue=oe.style,ie={focus:"[nu-focus]",hover:":hover",pressed:"[aria-pressed=\"true\"]",disabled:"[disabled]",active:"[nu-active]",sticky:"[nu-sticky]",even:":nth-child(even)",odd:":nth-child(odd)"},ae=[],le="nude:task";window.addEventListener("message",function(e){if(e.data===le){for(let e of ae)e();ae.splice(0);}});const se={},ce=document.createElement("div"),fe={has(e){return !!se[e]}},pe={},he={set:O,get:function(e=""){const n=e.trim().split(/\s+/g);return n.reduce((e,n)=>(Object.assign(e,pe[n]||{}),e),{})},extend:function(e,n){const t=pe[e];t&&(Object.assign(t,n),O(e,t));}},me={xxs:[.666,1],xs:[.75,1],sm:[.875,1.5],md:[1,1.5],lg:[1.25,2],xl:[1.5,2],xxl:[2,2.5],h1:[2,2.5,700],h2:[1.8,2.5,700],h3:[1.6,2,700],h4:[1.4,2,700],h5:[1.2,1.5,700],h6:[1,1.5,500]};Object.keys(me).forEach(e=>{he.set(e,{"font-size":`${me[e][0]}rem`,"line-height":`${me[e][1]}rem`,"font-weight":e.startsWith("h")?me[e][2]+"":""});}),["i","italic"].forEach(e=>O(e,{"font-style":"italic"})),["u","underline"].forEach(e=>O(e,{"text-decoration":"underline"})),["s","strikethrough"].forEach(e=>O(e,{"text-decoration":"line-through"})),[1,2,3,4,5,6,7,8,9].forEach(e=>O(`w${e}`,{"font-weight":`${e}00`})),["uppercase","lowercase"].forEach(e=>O(e,{"text-transform":e})),["baseline","sub","super","text-top","text-bottom","middle","top","bottom"].forEach(e=>O(e,{"vertical-align":e})),["left","right","center","justify"].forEach(e=>O(e,{"text-align":e})),O("monospace",{"font-family":"monospace"}),O("spacing",{"letter-spacing":"var(--nu-theme-border-width)"}),O("ellipsis",{"max-width":"100%",overflow:"hidden","white-space":"nowrap","text-overflow":"ellipsis"}),O("wrap",{"white-space":"normal"}),O("nowrap",{"white-space":"nowrap"}),O("scroll",{overflow:"auto"}),O("no-overflow",{overflow:"hidden"}),O("round",{"border-radius":"9999rem"}),O("ellipse",{"border-radius":"50%"}),O("relative",{position:"relative"}),O("color",{color:"var(--nu-theme-color)"}),O("background",{"background-color":"var(--nu-theme-background-color)"}),O("special",{color:"var(--nu-theme-special-color)"}),O("minor",{color:"var(--nu-theme-minor-color)"}),O("transparent",{"background-color":"transparent"}),O("swap",{color:"var(--nu-theme-background-color)","background-color":"var(--nu-theme-color)"});const ge=["block","table","flex","grid"],be={},ve={},ye=[];class xe extends HTMLElement{static get nuTag(){return ""}static get nuParent(){return Object.getPrototypeOf(this)}static get nuAllAttrs(){return be[this.nuTag]||(be[this.nuTag]={...(this.nuParent.nuAllAttrs||{}),...this.nuAttrs})}static get nuAttrs(){return {id:""}}static get nuAttrsList(){return Object.keys(this.nuAllAttrs)}static get nuDefaults(){return {display:"none"}}static get nuAllDefaults(){return ve[this.nuTag]||(ve[this.nuTag]={...(this.nuParent.nuAllDefaults||{}),...this.nuDefaults})}static get observedAttributes(){return this.nuAttrsList}static nuInit(){const e=this.nuTag;if(!e||ye.includes(e))return;ye.push(e);let n=this,t="";do{if(!n.nuCSS)break;if(n.nuCSS===(n.nuParent&&n.nuParent.nuCSS))continue;t=`${n.nuCSS(this)}${t}`;}while(n=n.nuParent);const r=this.nuAllAttrs,d=this.nuAllDefaults;let o="";return Object.keys(d).forEach(n=>{const t=d[n];if(null!=t){const u=T(n,t+"",r,d);if(u){const t="mod"===n?e:`${e}:not([${n}])`;o+=j(t,u);}}}),L(`${t}${o}`,e),customElements.define(e,this),e}attributeChangedCallback(e,n,t){this.nuChanged(e,n,t);}connectedCallback(){this.nuConnected(),this.nuIsMounted=!0;}disconnectedCallback(){this.nuDisconnected();}get nuId(){return this.id&&this.id.includes("--")?this.id:s(this)}get nuElement(){return !0}nuSetMod(e,n){const t=`nu-${e}`;!1===n||null==n?this.removeAttribute(t):this.setAttribute(t,!0===n?"":n);}nuHasMod(e){return this.hasAttribute(`nu-${e}`)}nuEmit(e,n=null){this.dispatchEvent(new CustomEvent(e,{detail:n,bubbles:!this.hasAttribute("prevent")}));}nuChanged(e,n,t){if("id"===e)return this.nuId}nuConnected(){setTimeout(()=>this.nuParent=this.parentNode);}nuDisconnected(){}nuQueryParent(e){return o(this,e)}nuInvertQuery(e){return u(this,e)}nuInvertQueryById(e){return i(this,e)}nuDebug(...e){}}const ke=[...ee,"shadow-intensity","shadow-opacity","special-shadow-opacity"],we=[...ee,"border-radius","border-width","padding","shadow-intensity","shadow-opacity","animation-time","special-shadow-opacity"],Ce={"":"0",below:"-1",above:"1",front:"9999",back:"-9999"},Se=["content","items","self"].map(e=>CSS.supports(`place-${e}`,"stretch stretch")?`place-${e}`:function(n){const t=n&&n.trim().split(/\s+/);return n?{[`align-${e}`]:t[0],[`justify-${e}`]:t[1]||t[0]}:null}),Ae=["outside-top","outside-right","outside-bottom","outside-left"],Ne=["center-top","center-right","center-bottom","center-left"],Te={"center-top":{y:"-50%"},"center-right":{x:"50%"},"center-bottom":{y:"50%"},"center-left":{x:"-50%"}},Ee=["top","right","bottom","left"],$e=["inside","cover","fixed",...Ee,...Ae,...Ne],Ve={row:"margin-right",column:"margin-bottom","row-reverse":"margin-left","column-reverse":"margin-top"},Re={content:"content-box",border:"border-box"},Ie=["inside","center","outside"],ze=[...Ie,"none","hidden","dotted","dashed","solid","double","groove","ridge","inset","outset"],Le=["top","right","bottom","left"],Me={top(e,n){return `0 calc(${e} * ${n?-1:1})`},right(e,n){return `calc(${e} * ${n?1:-1}) 0`},bottom(e,n){return `0 calc(${e} * ${n?1:-1})`},left(e,n){return `calc(${e} * ${n?-1:1}) 0`}},Be={cursor:"cursor",responsive:""},je="responsive",He=n("background-color","background"),We=n("color","text");class Ge extends xe{static get nuTag(){return ""}static get nuRole(){return ""}static get nuAttrs(){return {var(e){if(!e)return null;const n=e.split(":");return {[n[0]]:t(n[1])}},display(e){return e?ge.includes(e)?[{$suffix:":not([inline])",display:e},{$suffix:"[inline]",display:`inline-${e}`}]:{display:e}:void 0},width:d("width"),height:d("height"),sizing(e){return e=Re[e],e?{"box-sizing":e}:null},radius:r("border-radius",{multiplier:"var(--nu-theme-border-radius)",empty:"var(--nu-theme-border-radius)",property:!0,convert:!0}),"items-radius":r("border-radius",{suffix:">:not([radius])",multiplier:"var(--nu-theme-border-radius)",empty:"var(--nu-theme-border-radius)",property:!0,convert:!0}),padding:r("padding",{multiplier:"var(--nu-theme-padding)",empty:"var(--nu-theme-padding)",convert:!0}),"items-padding":r("padding",{suffix:">:not[padding]",multiplier:"var(--nu-theme-padding)",empty:"var(--nu-theme-padding)",convert:!0}),space(e){if(e){e=t(e,"var(--nu-theme-padding)"),e.startsWith("calc(")&&(e=e.slice(5,-1));const n=x(e).map(n=>n.match(/^0[^\.]/)?"":`calc(${n||e} * -1)`);return {"margin-top":n[0],"margin-right":n[1],"margin-bottom":n[2],"margin-left":n[3]}}},border(e){if(null==e)return e;let n="solid",r=[],d="var(--nu-theme-border-color)";const o=V(e,"special");null!=o&&(e=o,d="var(--nu-theme-special-color)");for(let t of ze){const r=V(e,t);null!=r&&(e=r,n=t);}for(let n of Le){const t=V(e,n);null!=t&&(e=t,r.push(n));}if(e=e?t(e,"var(--nu-theme-border-width)"):"var(--nu-theme-border-width)","center"===n&&(e=`calc(${e} / 2)`),"hidden"===n&&(n="solid",d="transparent"),Ie.includes(n))return r.length?{"--nu-stroke-shadow":r.map(t=>{let o=Me[t];return `${"inside"===n?"0 0":o(e,!0)} 0 ${r.length?0:e} ${d},
                  inset ${"outside"===n?"0 0":o(e)} 0 ${r.length?0:e} ${d}`}).join(",")}:{"--nu-stroke-shadow":`0 0 0 ${"inside"===n?0:e} ${d},
            inset 0 0 0 ${"outside"===n?0:e} ${d}`};const u=`${e} ${n} ${d}`;return r.length?r.reduce((e,n)=>(e[`border-${n}`]=u,e),{}):{border:u}},shadow(e){if(null==e)return e;const n=""===e?"1rem":t(e,".5rem");return {"--nu-depth-shadow":`0 0 ${n} rgba(0, 0, 0, calc(var(--nu-theme-shadow-opacity) / ${2*(+e||1)}))`}},flow(e,n){if(!e)return;const t=`${e} nowrap`,r=n.display.endsWith("flex"),d=n.display.endsWith("grid"),o=CSS.supports("grid-auto-flow",e),u=CSS.supports("flex-flow",t),i=Ve[e],a=[];return o&&(d&&a.push({$suffix:":not([display])","grid-auto-flow":e}),a.push({$suffix:"[display$=\"grid\"]","grid-auto-flow":e})),u&&(r&&a.push({$suffix:":not([display])","flex-flow":t},{$suffix:`:not([display])>:not(:last-child)`,[i]:"var(--nu-flex-gap)"}),a.push({$suffix:"[display$=\"flex\"]","flex-flow":t},{$suffix:`[display$="flex"]>:not(:last-child)`,[i]:"var(--nu-flex-gap)"})),a},gap(e,n){if(null==e)return;e=t(e||"1x","var(--nu-theme-padding)");const r=n.display.endsWith("flex"),d=n.display.endsWith("grid"),o=[{$suffix:"[display$=\"grid\"]","grid-gap":e},{$suffix:`[display$="flex"]>*`,"--nu-flex-gap":e}];return d&&o.push({$suffix:":not([display])","grid-gap":e}),r&&o.push({$suffix:`:not([display])>*`,"--nu-flex-gap":e}),o},order:"order",grow:"flex-grow",shrink:"flex-shrink",basis:r("flex-basis",{convert:!0}),"items-basis":r("flex-basis",{suffix:">:not([basis])",convert:!0}),"items-grow":r("flex-grow",{suffix:">:not([grow])"}),"items-shrink":r("flex-shrink",{suffix:">:not([shrink])"}),"place-content":Se[0],"place-items":Se[1],content:Se[0],items:Se[1],"template-areas":"grid-template-areas",areas:"grid-template-areas","auto-flow":"grid-auto-flow","template-columns":r("grid-template-columns",{convert:!0}),"template-rows":r("grid-template-rows",{convert:!0}),columns:r("grid-template-columns",{convert:!0}),rows:r("grid-template-rows",{convert:!0}),column:"grid-column",row:"grid-row",area:"grid-area",place(e){if(!e)return;let n="";$(e,"relative")&&(e=V(e,"relative"),n="relative");const t=$e.find(n=>$(e,n));if(t){const n={position:$(e,"fixed")?"fixed":"absolute"};let t=0,r=0;return "cover"===e.trim()?{...n,top:"0",right:"0",bottom:"0",left:"0"}:(Ne.forEach((d,o)=>{$(e,d)&&(n[Ee[Ne.indexOf(d)]]="0",delete n[Ee[(Ne.indexOf(d)+2)%4]],Te[d].x&&(t=Te[d].x),Te[d].y&&(r=Te[d].y),o%2&&!n.top&&!n.bottom&&(n.top="50%"),0==o%2&&!n.left&&!n.right&&(n.left="50%"));}),Ee.forEach((t,r)=>{$(e,t)&&(n[t]="0",delete n[Ee[(Ee.indexOf(t)+2)%4]],r%2&&!n.top&&!n.bottom&&(n.top="50%"),0==r%2&&!n.left&&!n.right&&(n.left="50%"));}),Ae.forEach((t,r)=>{$(e,t)&&(n[Ee[(Ae.indexOf(t)+2)%4]]="100%",delete n[Ee[Ae.indexOf(t)]],r%2&&!n.top&&!n.bottom&&(n.top="50%"),0==r%2&&!n.left&&!n.right&&(n.left="50%"));}),$(e,"inside")&&(!n.left&&(n.left="50%"),!n.top&&(n.top="50%")),"50%"===n.left&&(t="-50%"),"50%"===n.top&&(r="-50%"),n.transform=`translate(${t}, ${r})`,n)}return n?"string"==typeof Se[2]?{[Se[2]]:e,position:n}:{...Se[2](e),position:n}:"string"==typeof Se[2]?{[Se[2]]:e}:Se[2](e)},z(e){return null==e?void 0:{"z-index":Ce[e]||e}},events(e){return null==e?void 0:{"pointer-events":"none"===e?e:"auto"}},theme(e){if(null==e)return;e||(e="default");const n=P(e),t=F(e),r=we.reduce((r,d)=>(r[`--nu-theme-${d}`]=n&&ke.includes(d)?`var(--nu-${t}-${d})`:`var(--nu-${e}-${d})`,r),{});return [r,{$suffix:":not([color])",color:r["--nu-theme-color"]}]},color(e){if(null!=e){if(e.includes(" ")){const n=e.split(" ");return {...We(n[0]),...He(n[1])}}return We(e)}},background(e){return e&&(e.includes("url(")||e.includes("gradient"))?{background:e,"background-color":"var(--nu-theme-background-color)"}:He(e)},transform(e){return e?{transform:e}:null},mod(e){return e?he.get(e):void 0},cursor(e){return e?{cursor:e}:null},size(e){if(!e)return null;const n=e.trim().split(/\s+/),r=[];return r[0]=me[n[0]]?me[n[0]][0]+"":n[0],r[1]=!n[1]&&me[n[0]]?me[n[0]][1]+"":me[n[1]]?me[n[1]][1]+"":n[1],{"font-size":t(r[0]),"line-height":t(r[1]||"1.5")}},hidden(e){return "true"!==e&&"y"!==e&&""!==e?null:{display:"none !important"}},opacity(e){return null==e?void 0:{opacity:e}},transition(e){if(null!=e)return e=e.split(",").map(e=>`${e} var(--nu-theme-animation-time) linear`).join(","),{transition:e}},...Be,controls:"",label:"",labelledby:"",describedby:""}}static get nuAttrsList(){return Object.keys(this.nuAllAttrs)}static get nuDefaults(){return {display:"inline-block",sizing:"border"}}static nuCSS({nuTag:e}){return `
      ${e}[nu-hidden] {
        display: none !important;
      }
      ${e}{
        --nu-depth-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
        --nu-stroke-shadow: 0 0 0 0 rgba(0, 0, 0, 0), inset 0 0 0 0 rgba(0, 0, 0, 0);
        --nu-toggle-shadow: 0 0 0 0 rgba(0, 0, 0, 0) inset;

        box-shadow: var(--nu-stroke-shadow),
          var(--nu-toggle-shadow),
          var(--nu-depth-shadow);
      }
    `}static get observedAttributes(){return this.nuAttrsList}get nuRole(){return this.getAttribute("role")||this.constructor.nuRole}set nuRole(e){this.setAttribute("role",e);}constructor(){super(),this.nuTabIndex=0,this.nuRef=null,this.nuThemes={};}connectedCallback(){const e=this.constructor.nuRole;!this.hasAttribute("role")&&e&&this.setAttribute("role",e),this.nuConnected(),this.nuIsMounted=!0;}attributeChangedCallback(e,n,t){super.attributeChangedCallback(e,n,t),null!=t&&this.constructor.nuAllAttrs[e]&&this.nuApplyCSS(e,t);}nuGetCSS(e,n,t){const r=t.includes("|");if(r){this.nuSetMod(je,!0);let r=this;for(;r&&(!r.getAttribute||!r.getAttribute(je)||!r.nuResponsive);)r=r.parentNode;if(!r)return void setTimeout(()=>{const e=this.getAttribute(n);t!==e||this.nuApplyCSS(n,t);},100);const d=t.split("|"),o=d.map((t,r)=>{if(!t||t.trim()){if(!t){if(!r)return;for(let e=r-1;0<=e;e--)if(d[e]){t=d[e];break}if(!t)return}const o=T(n,t,this.constructor.nuAllAttrs,this.constructor.nuAllDefaults);return j(e,o)}});return r.nuResponsive()(o)}let d=T(n,t,this.constructor.nuAllAttrs,this.constructor.nuAllDefaults);return j(e,d)}nuApplyCSS(e,n,t=!1){if("var"===e)return;const r=n.includes("|");let d;if(d=r?`${this.nuGetContext(je)}${this.nuGetQuery({[e]:n},this.getAttribute(je))}`:this.nuGetQuery({[e]:n}),D(d)){if(!t)return;G(d);}const o=this.nuGetCSS(d,e,n);o&&W(d,d,o);}nuSetAria(e,n){"boolean"==typeof n&&(n=n?"true":"false"),null==n?this.removeAttribute(`aria-${e}`):this.setAttribute(`aria-${e}`,n);}nuGetQuery(e={},n){return `${n?"":this.constructor.nuTag}${n?`#${this.nuId}`:""}${M(e)}`}nuSetFocusable(e){e?(this.nuRef||this).setAttribute("tabindex",this.nuTabIndex):(this.nuRef||this).removeAttribute("tabindex"),this.nuFocusable||((this.nuRef||this).addEventListener("focus",()=>{this.nuSetMod("focus",!0);}),(this.nuRef||this).addEventListener("blur",()=>{this.nuSetMod("focus",!1);}),document.activeElement===this.nuRef&&this.nuSetMod("focus",!0),this.nuFocusable=!0);}nuConnected(){this.setAttribute("nu","");}nuChanged(e,n,t){super.nuChanged(e,n,t),e===je?(s(this),setTimeout(()=>{if(this.getAttribute(je)===t){const e=this.querySelectorAll("[nu-responsive]");[...e].forEach(e=>{e.nuApplyCSS&&[...e.attributes].forEach(({name:n,value:t})=>{e.constructor.nuAttrsList.includes(n)&&t.includes("|")&&e.nuApplyCSS(n,t,!0);});});}},0)):"label"===e||"valuemin"===e||"valuemax"===e||"valuenow"===e||"setsize"===e||"posinset"===e?this.nuSetAria(e,t):"controls"===e||"labelledby"===e||"describedby"===e||"owns"===e||"flowto"===e||"activedescendant"===e?z(()=>{const n=t.split(/\s+/g).map(e=>{const n=this.nuInvertQueryById(e);return n?s(n):""}).join(" ");n.trim()&&this.nuSetAria(e,n);}):void 0;}nuResponsive(){const e=this.getAttribute("responsive");if(this.nuReponsiveFor===e)return this.nuResponsiveDecorator;if(this.nuReponsiveFor=e,!e)return this.nuResponsiveDecorator=e=>e;const n=e.split(/\|/),t=n.map((e,t)=>{if(!t)return `@media (min-width: ${e})`;const r=n[t-1];return `@media (max-width: calc(${r} - 1px)) and (min-width: ${e})`});return t.push(`@media (max-width: calc(${n.slice(-1)[0]} - 1px))`),this.nuResponsiveDecorator=e=>t.map((n,t)=>{let r;if(e[t])r=e[t];else for(let n=t-1;0<=n;n--)if(e[n]){r=e[n];break}return `${n}{\n${r||""}\n}\n`}).join("")}nuGetContext(e){let n="",t=this;for(;t=t.parentNode;)t.getAttribute&&t.getAttribute(e)&&t.nuId&&(n=`#${t.nuId} ${n}`);return n}nuScrollTo(e){if(e){const n=this.nuInvertQueryById(e);n&&scrollTo(0,n.getBoundingClientRect().y+window.pageYOffset);}}nuDeclareTheme(e,n,t={}){if(this.nuThemes[e]&&this.nuThemes[e].styleElement&&this.nuThemes[e].styleElement.parentNode){let n=this.nuThemes[e].styleElement;n.parentNode.removeChild(n);}if(!n)return delete this.nuThemes[e],void this.nuSetMod(`themes`,Object.keys(this.nuThemes).join(" "));"default"!==e&&this.nuThemes.default&&(n={...{...this.nuThemes.default.light,...this.nuThemes.default.dark},...n}),s(this);const r=window.getComputedStyle(this.parentNode),d=we.reduce((e,n)=>{const t=C(n),d=r.getPropertyValue(`--nu-default-${t}`);return d&&(e[w(n)]=d),e},{});[n,t].forEach(e=>{Object.keys(e).forEach(n=>{if(e[n]&&~e[n].indexOf("var(")){const t=e[n].trim().slice(4,-1);e[n]=r.getPropertyValue(t).trim();}});});const[o,u]=U(n,t,d),i=`#${this.nuId}`,a=B(q(o,`${e}-light`)),l=B(q(u,`${e}-dark`)),c=B(q(o,e)),f=B(q(u,e)),p="default"===e?B(we.reduce((n,t)=>(n[`--nu-theme-${t}`]=`var(--nu-${e}-${t})`,n),{})):"",h=`
      ${p?`${i}{${p}}`:""}
      ${i}{${a}${l}}
    `;let m;m=matchMedia("(prefers-color-scheme)").matches?W(`theme:${e}:${i}`,i,`
        ${h}
        @media (prefers-color-scheme: dark) {
          html.nu-prefers-color-scheme ${i}{${f}}
          html.nu-prefers-color-scheme-dark ${i}{${f}}
          html.nu-prefers-color-scheme-light ${i}{${c}}
        }
        @media (prefers-color-scheme: light), (prefers-color-scheme: no-preference) {
          html.nu-prefers-color-scheme ${i}{${c}}
          html.nu-prefers-color-scheme-light ${i}{${c}}
          html.nu-prefers-color-scheme-dark ${i}{${f}}
        }
        html:not(.nu-prefers-color-scheme):not(.nu-prefers-color-scheme-light):not(.nu-prefers-color-scheme-dark) ${i}{${c}}
      `).element:W(`theme:${i}`,i,`
        ${h}
        html:not(.nu-prefers-color-scheme-dark) ${i}{${c}}
        html.nu-prefers-color-scheme-dark ${i}{${f}}
      `).element,this.nuThemes[e]={light:c,dark:f,styleElement:m},this.nuSetMod(`themes`,Object.keys(this.nuThemes).join(" "));}}class De extends Ge{static get nuTag(){return "nu-block"}static get nuDefaults(){return {display:"block"}}}class Oe extends De{static get nuTag(){return "nu-grid"}static get nuDefaults(){return {display:"grid",flow:"row"}}}const Pe=[1,2,3,4,5,6];class Fe extends De{static get nuTag(){return "nu-heading"}static get nuRole(){return "heading"}static get nuAttrs(){return {level(e){return e&&Pe.includes(+e)||(e=1),[{$suffix:":not([size])","font-size":`${me[`h${e}`][0]}rem`,"line-height":`${me[`h${e}`][1]}rem`},{"font-weight":`${me[`h${e}`][2]}`}]}}}static get nuDefaultLevel(){return 1}static get nuDefaults(){return {level:1,color:"var(--nu-theme-heading-color)"}}static nuCSS({nuTag:e}){return `
      ${e} {
        position: relative;
      }
    `}nuChanged(e,n,t){super.nuChanged(e,n,t),"level"===e?(t||(t=1),this.nuSetAria("level",t)):void 0;}nuConnected(){super.nuConnected(),this.hasAttribute("level")||this.nuChanged("level");}}let qe;class Ue extends De{static get nuTag(){return "nu-icon"}static get nuRole(){return "img"}static nuLoader(n){return (qe||(qe=window.feather?Promise.resolve():e("https://cdnjs.cloudflare.com/ajax/libs/feather-icons/4.22.1/feather.js"))).then(()=>window.feather.icons[n].toSvg())}static get nuAttrs(){return {size(e){const n=t(e||"");return e?{"min-width":n,"min-height":n,"--nu-size":n}:null},name(e,n){return e?{$suffix:` > [name="${e}"]`,display:`${n.display} !important`}:null}}}static get nuDefaults(){return {display:"inline-block"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-size: 1em;

        position: relative;
        vertical-align: middle;
        min-width: 1em;
        min-height: 1em;
        background-color: transparent !important;
      }

      ${e} > svg {
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--nu-size);
        height: var(--nu-size);
        transform: translate(-50%, -50%);
      }

      ${e} > :not(svg) {
        display: none;
      }

      ${e}[inline] {
        bottom: 0.0675em;
      }
    `}nuChanged(e,n,t){if(super.nuChanged(e,n,t),"name"===e){const e=R(t);this.innerHTML="",e.forEach(e=>{this.querySelector(`svg[name="${e}"]`)||this.constructor.nuLoader(e).then(n=>{const t=I(n);t.setAttribute("name",e),t.style.display="none",this.appendChild(t);});});}}nuUpdateTheme(e){super.nuUpdateTheme(e);}}class Ke extends De{static get nuTag(){return "nu-line"}static get nuRole(){return "separator"}static get nuAttrs(){return {orient(e){return "y"===e?{"min-width":"var(--nu-line-size)","max-width":"var(--nu-line-size)","min-height":"100%","max-height":"100%","grid-row":"1 / -1"}:{"min-height":"var(--nu-line-size)","max-height":"var(--nu-line-size)","min-width":"100%","max-width":"100%","grid-column":"1 / -1"}},size:r("--nu-line-size",{convert:!0,multiplier:"var(--nu-theme-border-width)",empty:"var(--nu-theme-border-radius)"}),background:null}}static get nuDefaults(){return {place:"stretch",orient:"x"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-line-size: var(--nu-theme-border-width);

        position: relative;
        line-height: 0;
        background-color: currentColor !important;
        color: var(--nu-theme-border-color);
      }

      ${e}[special]:not([color]) {
        color: var(--nu-theme-special-color);
      }
    `}}class Qe extends De{static get nuTag(){return "nu-flex"}static get nuDefaults(){return {display:"flex",flow:"row",gap:0}}}class _e extends Qe{static get nuTag(){return "nu-pane"}static get nuDefaults(){return {"place-content":"stretch space-between","place-items":"center",gap:.5,width:"100%"}}}class Ye extends De{static get nuTag(){return "nu-card"}static get nuDefaults(){return {padding:"2x",color:"",background:"",border:"1x",radius:"1x"}}static nuCSS({nuTag:e}){return `
      ${e} {
        transition: background var(--nu-theme-animation-time) linear,
          color var(--nu-theme-animation-time) linear,
          box-shadow var(--nu-theme-animation-time) linear,
          transform var(--nu-theme-animation-time) linear,
          border var(--nu-theme-animation-time) linear,
          border-radius var(--nu-theme-animation-time) linear;
        position: relative;
        scrollbar-width: none;
      }
    `}}class Je extends Qe{static get nuTag(){return "nu-flow"}static get nuDefaults(){return {flow:"column"}}static nuCSS({nuTag:e}){return `
      ${e}{
        align-content: stretch;
        justify-content: flex-start;
        align-items: stretch;
      }
    `}}class Xe extends Ge{static get nuTag(){return ""}static get nuRole(){return "button"}static get nuAttrs(){return {disabled:"",pressed:"",href:"",target:"",controls:"",value:""}}static nuNavigate(e,n){const t=document.createElement("a");t.href=e,n&&(t.target="_blank"),document.body.appendChild(t),t.click(),document.body.removeChild(t);}static get nuDefaults(){return {color:"inherit",background:"",radius:"",mod:"nowrap",transition:"box-shadow, color, background-image, background-color"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-toggle-color: transparent;
        --nu-depth-color: transparent;
        --nu-hover-color: transparent;
        --nu-depth-shadow: 0 0 0 rgba(0, 0, 0, 0);

        position: relative;
        opacity: 1;
        z-index: 0; /* to make :hover::after z-index work as expected */
        background-image: linear-gradient(to right, var(--nu-hover-color), var(--nu-hover-color));
      }

      ${e}[tabindex] {
        cursor: pointer;
      }

      ${e}[disabled] {
        opacity: .5;
        cursor: default;
      }
      
      ${e}:not([disabled])[tabindex]:hover {
        --nu-hover-color: var(--nu-theme-hover-color);
      }

      ${e}[nu-active] {
        z-index: 2;
      }

      ${e}[aria-pressed="true"] {
        z-index: 1;
      }

      ${K(e)}
    `}nuConnected(){super.nuConnected(),this.hasAttribute("pressed")||this.nuSetValue(!1),this.nuSetFocusable(!this.hasAttribute("disabled")),k.call(this),setTimeout(()=>{if(this.parentNode){switch(this.parentNode.nuRole){case"radiogroup":this.parentNode.nuGetValue()&&this.setAttribute("role","radio");break;case"menu":this.setAttribute("role","menuitem");break;case"tablist":this.setAttribute("role","tab");break;default:return;}this.parentNode.nuSetValue&&this.parentNode.nuSetValue(this.parentNode.nuGetValue(),!1);}},0);}nuTap(){if(this.hasAttribute("disabled"))return;if(this.hasAttribute("scrollto")&&this.nuScrollTo(this.getAttribute("scrollto")),this.hasAttribute("to")){const e=this.getAttribute("to");this.constructor.nuNavigate(e.replace(/^!/,""),e.startsWith("!"));}this.nuEmit("tap");const e=this.parentNode,n=this.nuGetValue();n&&e.nuSetValue&&e.nuGetValue()!==n&&e.nuSetValue(n);}nuChanged(e,n,t){super.nuChanged(e,n,t),"disabled"===e?(this.nuSetMod("disabled",null!=t),this.nuSetFocusable(null==t)):"pressed"===e?(t=null!=t,t&&parent.nuSetValue?parent.nuSetValue(t):this.nuSetValue(t)):"value"===e?this.parentNode&&this.parentNode.nuSetValue&&this.parentNode.nuSetValue(this.parentNode.nuGetValue()):void 0;}nuSetValue(e){this.nuSetAria("pressed",e),z(()=>{if("tab"===this.nuRole&&e===this.pressed){const n=this.getAttribute("controls");if(n){const t=this.nuInvertQueryById(n);if(t&&t.nuSetMod){const n=s(t),r=s(this);t.nuSetAria("controls",n),t.nuSetAria("labelledby",r),t.nuSetMod("hidden",!e),t.nuRole||(t.nuRole="tabpanel");}}}});}get pressed(){return "true"===this.getAttribute("aria-pressed")}nuGetValue(){return this.getAttribute("value")||this.getAttribute("controls")}}class Ze extends Xe{static get nuTag(){return "nu-btn"}static get nuDefaults(){return {display:"inline-grid",padding:"1x 2x",border:"1x",radius:"1x",flow:"column",gap:"1x",content:"center",background:""}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-toggle-color: transparent;
        --nu-toggle-shadow: 0 0 .75em 0 var(--nu-toggle-color) inset;
        
        user-select: none;
      }

      ${e}:not([disabled])[tabindex]:hover {
        --nu-hover-color: var(--nu-theme-hover-color);
      }

      ${e}[disabled][aria-pressed="true"],
      ${e}[nu-active]:not([disabled]):not([aria-pressed="true"]),
      ${e}[aria-pressed="true"][role="radio"][nu-active]:not([disabled]),
      ${e}[aria-pressed="true"]:not([disabled]):not([nu-active]) {
        --nu-toggle-color: rgba(0, 0, 0, var(--nu-theme-shadow-opacity));
      }

      ${e}[special]:not([background]) {
        --nu-theme-shadow-opacity: var(--nu-theme-special-shadow-opacity);
        --nu-theme-hover-color: var(--nu-theme-special-hover-color);
        --nu-theme-heading-color: var(--nu-theme-special-background-color);
        background-color: var(--nu-theme-special-color) !important;
        color: var(--nu-theme-special-background-color) !important;
      }
      
      ${e}[special]:not([background]) > * {
        --nu-theme-border-color: var(--nu-theme-special-background-color);
        --nu-theme-hover-color: --nu-theme-special-hover-color;
      }

      ${e}[cell] {
        align-self: stretch;
        justify-self: stretch;
        width: 100%;
        height: 100%;
      }
      
      ${e}[cell]:not([radius]) {
        --nu-border-radius: 0;
      }
      
      ${e}[cell]:not([border]) {
        border: none;
      }
    `}}class en extends Xe{static get nuTag(){return "nu-tab"}static get nuRole(){return "tab"}static get nuDefaults(){return {display:"inline-grid",padding:"1x 0",background:"transparent",radius:0,flow:"column",gap:"1x",items:"center"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-toggle-color: transparent;
        --nu-depth-color: transparent;
        --nu-stroke-color: transparent;
        --nu-hover-color: transparent !important;

        --nu-toggle-shadow: 0 calc(-1 * var(--nu-theme-border-width)) 0 0 var(--nu-toggle-color) inset;
        --nu-depth-shadow: 0 0 0 rgba(0, 0, 0, 0);
      }

      ${e}[nu-active][tabindex]:not([disabled]):not([nu-toggled]),
      ${e}[nu-toggled]:not([disabled]):not([tabindex]) {
        --nu-toggle-shadow: 0 calc(1em / 16 * -3) 0 0 var(--nu-toggle-color) inset;
        --nu-toggle-color: var(--nu-theme-special-color);
      }

      ${e}[special] {
        color: var(--nu-theme-special-color) !important;
      }

      ${e}:not([disabled])[tabindex]:hover {
        --nu-toggle-color: var(--nu-theme-special-color);
      }

      ${e}[nu-active][tabindex]:not([disabled]):not([aria-pressed="true"]),
      ${e}[aria-pressed="true"]:not([disabled]):not([nu-active]) {
        --nu-toggle-shadow: 0 calc(1em / 16 * -3) 0 0 var(--nu-toggle-color) inset;
        --nu-toggle-color: var(--nu-theme-special-color);
      }
    `}}class nn extends De{static get nuTag(){return "nu-switch"}static get nuRole(){return "switch"}static get nuAttrs(){return {disabled:"",checked:""}}static get nuDefaults(){return {display:"inline-block"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-depth-color: transparent;
        --nu-border-radius: calc(var(--nu-size) / 2);
        --nu-switch-color: rgba(0, 0, 0, 0);

        --nu-border-shadow: inset 0 0 0 var(--nu-theme-border-width) var(--nu-theme-border-color);
        --nu-depth-shadow: 0 .25rem 1.5rem var(--nu-depth-color);
        --nu-background-color: var(--nu-theme-background-color);
        --nu-switch-shadow: 0 0 1rem 0 var(--nu-switch-color) inset;

        --nu-size: 2em;
        --nu-circle-padding: calc(var(--nu-theme-border-width) * 4);
        --nu-circle-size: calc(var(--nu-size) - var(--nu-circle-padding) * 2);
        --nu-circle-offset: var(--nu-circle-padding);
        --nu-circle-opacity: 1;
        --nu-circle-border-radius: calc(var(--nu-circle-size) / 2);
        --nu-circle-background-color: var(--nu-theme-special-color);

        position: relative;
        width: calc(var(--nu-size) * 2);
        height: var(--nu-size);
        border-radius: var(--nu-border-radius);
        background-color: var(--nu-background-color);
        cursor: pointer;
        box-shadow: var(--nu-depth-shadow),
          var(--nu-switch-shadow),
          var(--nu-border-shadow);
        transition: box-shadow var(--nu-theme-animation-time) linear,
        filter var(--nu-theme-animation-time) linear;
        user-select: none;
        vertical-align: middle;
      }

      ${e}::after {
        content: "";
        position: absolute;
        display: block;
        width: var(--nu-circle-size);
        height: var(--nu-circle-size);
        pointer-events: none;
        left: 0;
        top: var(--nu-circle-padding);
        transform: translate(var(--nu-circle-offset), 0);
        transition: transform var(--nu-theme-animation-time) linear,
          opacity var(--nu-theme-animation-time) linear,
          background-color var(--nu-theme-animation-time) linear;
        background-color: var(--nu-circle-background-color);
        border-radius: var(--nu-circle-border-radius);
        /*box-shadow: var(--nu-border-shadow);*/
        opacity: var(--nu-circle-opacity);
      }

      ${e}[disabled] {
        opacity: .5;
        cursor: default;
      }

      ${e}[aria-checked="true"] {
        --nu-background-color: var(--nu-theme-special-color);
        --nu-circle-offset: calc(var(--nu-size) * 2 - var(--nu-circle-padding) - var(--nu-circle-size));
        --nu-circle-opacity: 1;
        --nu-circle-background-color: var(--nu-theme-background-color);
      }

      ${e}[nu-active]:not([disabled]):not([aria-checked="true"]) {
        --nu-switch-color: rgba(0, 0, 0, var(--nu-theme-shadow-opacity));
      }
      
      ${e}[nu-active][aria-checked="true"]:not([disabled]) {
        --nu-switch-color: rgba(0, 0, 0, var(--nu-theme-special-shadow-opacity));
      }

      ${K(e)}
    `}constructor(){super();}nuConnected(){super.nuConnected(),this.nuSetValue(this.getAttribute("checked")),this.nuSetFocusable(!this.hasAttribute("disabled")),k.call(this);}get value(){return "true"===this.getAttribute("aria-checked")}nuTap(){this.nuToggle(),this.nuEmit("tap");}nuSetValue(e){e?this.nuSetAria("checked",!0):this.nuSetAria("checked",!1);}nuToggle(){this.nuSetValue(!this.value);}nuChanged(e,n,t){super.nuChanged(e,n,t),"disabled"===e?(this.nuSetMod("disabled",null!=t),this.nuSetFocusable(null==t)):"checked"===e?this.nuSetValue(null!=t):void 0;}}class tn extends Oe{static get nuTag(){return "nu-gridtable"}static get nuRole(){return "grid"}static get nuAttrs(){return {padding:r("padding",{suffix:">*:not([padding]):not(nu-line)",convert:!0})}}static get nuDefaults(){return {gap:"var(--nu-theme-border-width)",background:"var(--nu-theme-border-color)",color:"var(--nu-theme-color)"}}static nuCSS({nuTag:e}){return `
      ${e} {
        overflow: auto;
      }
      ${e}:not([gap]) {
        grid-gap: var(--nu-theme-border-width);
      }
      ${e} > :not([background]) {
        background-color: var(--nu-theme-background-color);
      }
      ${e}:not([padding]) > *:not([padding]):not(nu-line) {
        padding: .5rem;
      }
      ${e} > * {
        position: relative;
      }
    `}nuConnected(){super.nuConnected();}}class rn extends Ge{static get nuTag(){return "nu-badge"}static get nuAttrs(){return {border:De.nuAttrs.border,radius:De.nuAttrs.radius,shadow:De.nuAttrs.shadow}}static get nuDefaults(){return {background:"text",padding:"0 .5em"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-border-radius: .5rem;
        --nu-depth-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
        --nu-stroke-shadow: 0 0 0 0 var(--nu-theme-border-color), inset 0 0 0 0 var(--nu-theme-border-color);

        box-shadow: var(--nu-stroke-shadow), var(--nu-depth-shadow);
        border-radius: var(--nu-border-radius);
        white-space: nowrap;
      }
      ${e}:not([color]) {
        color: var(--nu-theme-background-color) !important;
      }
      ${e}[special]:not([background]) {
        background-color: var(--nu-theme-special-color) !important;
      }
      ${e}[special]:not([color]) {
        color: var(--nu-theme-special-background-color) !important;
      }
    `}}class dn extends Xe{static get nuTag(){return "nu-link"}static get nuRole(){return "link"}static get nuDefaults(){return {display:"inline-block",color:"special",mod:"nowrap",cursor:"pointer",radius:".5x"}}static nuCSS({nuTag:e}){return `
      ${e} {
        position: relative;
        transition: box-shadow var(--nu-theme-animation-time) linear;
        text-decoration: underline;
        font-weight: bolder;
        outline: none;
      }
      
      ${e}:not([disabled])[nu-active] {
        --nu-hover-color: var(--nu-theme-hover-color);
      }
      
      ${K(e)}
    `}}class on extends De{static get nuTag(){return "nu-input"}static get nuAttrs(){return {autofocus:"",disabled:"",value:"",maxlength:"",name:"",padding:r("--nu-padding",{multiplier:"var(--nu-theme-padding)",empty:"var(--nu-theme-padding)",convert:!0})}}static get nuDefaults(){return {display:"grid",flow:"column",radius:"",padding:"1x",mod:"center",background:"",border:"1x",place:"stretch"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-depth-color: transparent;
        --nu-depth-shadow: 0 0 0 var(--nu-theme-border-width) var(--nu-depth-color);

        position: relative;
        outline: none;
        user-select: none;
      }

      ${e} input {
        padding: var(--nu-padding);
        width: 100%;
        max-width: 100%;
        min-width: 100%;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        -webkit-appearance: none;
        background: transparent;
        color: inherit;
        border: none;
        outline: none;
        border-radius: inherit;
        box-sizing: border-box;
      }
      
      ${e} input:not(:first-child) {
        padding-left: 0;
      }
      
      ${e} input:not(:last-child) {
        padding-right: 0;
      }

      ${e} input[disabled] {
        color: var(--minor-color);
        background: var(--minor-background-color);
        -webkit-text-fill-color: var(--minor-color);
        -webkit-opacity: 1;
      }

      ${e} input::placeholder {
        -webkit-text-fill-color: currentColor;
        color: currentColor;
        opacity: .5;
      }
      
      ${e} nu-icon:not([width]) {
        width: calc(var(--nu-padding) * 2 + 1em);
      }

      ${e}[cell] {
        width: 100%;
        height: 100%;
      }
      
      ${e}[cell]:not([radius]) {
        --nu-border-radius: 0rem;
      }
      
      ${e}[cell]:not([border]) {
        border: none;
      }

      ${K(e,{force:!0})}
    `}nuCSSRef(){this.nuRef=this.querySelector("input");}nuChanged(e,n,t){super.nuChanged(e,n,t),"disabled"===e?(this.nuCSSRef(),this.nuRef&&(this.nuRef.disabled=null!=t,this.nuSetFocusable(null!=t))):void 0;}nuConnected(){super.nuConnected(),setTimeout(()=>{this.nuChanged("disabled","",this.getAttribute("disabled")),this.nuRef&&!this.nuRef.hasAttribute("placeholder")&&this.nuRef.setAttribute("placeholder","...");});}}class un extends Ge{static get nuTag(){return "nu-scroll"}static get nuRole(){return "scrollbar"}static get nuAttrs(){return {orientation:"",size:r("--nu-line-size"),color:"--nu-line-color"}}static get nuDefaults(){return {display:"block"}}nuCSS({nuTag:e}){return `
      ${e} {
        --nu-line-color: var(--nu-theme-special-color);
        --nu-line-size: .25rem;
        --nu-line-offset: 0%;
        --nu-line-length: 0%;

        position: absolute;
        top: 0;
        transform: translate(0, var(--nu-line-offset));
        right: var(--nu-pixel);
        height: var(--nu-line-length);
        width: var(--nu-line-size);
        line-height: 0;
        background-color: var(--nu-line-color);
        opacity: .5;
        transition: opacity var(--nu-theme-animation-time) linear,
          transform calc(var(--nu-theme-animation-time) / 2) ease-out;
        border-radius: .25rem;
        pointer-events: none;
      }

      [data-nu-no-scroll]::-webkit-scrollbar {
        display: none;
      }
    `}nuChanged(e,n,t){super.nuChanged(e,n,t),"orientation"===e&&(this.nuSetMod("horizontal","horizontal"!==t),this.nuSetAria("orientation","horizontal"===t?null:"vertical"));}nuConnected(){this.nuUpdate(),["wheel","scroll"].forEach(e=>{this.parentNode.addEventListener(e,()=>{this.nuUpdate();});}),this.parentNode.dataset.nuNoScroll="";}nuUpdate(){const e=this.parentNode,n=e.offsetHeight,t=e.scrollHeight,r=e.scrollTop;2>X(n-t)?(this.style.setProperty("--line-offset",""),this.style.setProperty("--line-length","")):(this.style.setProperty("--line-offset",`calc(${Z(r/t*n)}px + ${r}px)`),this.style.setProperty("--line-length",`${Z(100*(n/t))}%`));}}const an=Qe.nuAllAttrs.flow;class ln extends Qe{static get nuTag(){return "nu-btngroup"}static get nuRole(){return "radiogroup"}static get nuAttrs(){return {padding:"",value:"",flow(e,n){return e?[...an(e,n),{$suffix:`:not([gap]) > :first-child:not(:last-child)`,"--nu-border-radius":e.startsWith("row")?"var(--nu-item-border-radius) 0 0 var(--nu-item-border-radius) !important":"var(--nu-item-border-radius) var(--nu-item-border-radius) 0 0 !important"},{$suffix:`:not([gap]) > :last-child:not(:first-child)`,"--nu-border-radius":e.startsWith("row")?"0 var(--nu-item-border-radius) var(--nu-item-border-radius) 0 !important":"0 0 var(--nu-item-border-radius) var(--nu-item-border-radius) !important"}]:void 0},border(e){if(null==e)return e;const n=e?t(e):"var(--nu-theme-border-width)";return {$suffix:":not([border])","--nu-border-shadow":`var(--nu-border-inset, 0 0) 0 ${n} var(--nu-theme-border-color)`,"--nu-flex-gap":`calc(${n} * -1)`}}}}static get nuDefaults(){return {flow:"row",gap:"calc(var(--nu-theme-border-width) * -1)"}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-border-radius: var(--nu-theme-border-radius);
        --nu-item-border-radius: var(--nu-border-radius);

        border-radius: var(--nu-border-radius, .5rem);
      }
      ${e} > * {
        --nu-flex-gap: calc(var(--nu-theme-border-width) * -1);

        flex-grow:1;
      }
      ${e}:not([gap]) > * {
        --nu-flex-gap: calc(var(--nu-theme-border-width) * -1);
      }
      ${e}:not([gap]) > :not(:last-child):not(:first-child) {
        --nu-border-radius: 0 !important;
      }
      ${e}:not([gap]) > :last-child:first-child {
        --nu-border-radius: inherit !important;
      }
    `}nuChanged(e,n,t){super.nuChanged(e,n,t),"value"===e?this.nuSetValue(t,!1):void 0;}nuConnected(){super.nuConnected();const e=this.getAttribute("value");e?this.nuSetValue(e,!1):setTimeout(()=>{const e=this.querySelector(`nu-btn[value]`);e&&this.nuSetValue(e.nuGetValue());},0);}nuGetValue(){const e=this.getAttribute("value");if(e){const n=this.querySelector(`nu-btn[aria-pressed="true"]`);return n?n.getAttribute("value"):e}}nuSetValue(e,n=!0){setTimeout(()=>{[...this.childNodes].forEach(n=>{"NU-BTN"!==n.tagName||(n.getAttribute("value")===e?(n.nuSetAria("checked",!0),n.nuSetFocusable(!1),n.nuSetValue(!0)):(n.nuSetAria("checked",!1),n.nuSetFocusable(!0),n.nuSetValue(!1)));}),n&&this.nuEmit("input",e);},0);}}class sn extends Je{static get nuTag(){return "nu-menu"}static get nuRole(){return "menu"}}class cn extends Xe{static get nuTag(){return "nu-menuitem"}static get nuRole(){return "menuitem"}static get nuDefaults(){return {display:"inline-grid",padding:"1x",background:"transparent",width:"100%",flow:"column",gap:"1x",content:"center start",radius:0}}static nuCSS({nuTag:e}){return `
      ${e} {
        --nu-toggle-color: transparent;
        --nu-depth-color: transparent;
        --nu-focus-inset: inset 0 0;
        
        user-select: none;
      }

      ${e}:not([disabled])[tabindex]:hover {
        --nu-hover-color: var(--nu-theme-hover-color);
      }

      ${e}[nu-active][tabindex]:not([disabled]):not([nu-toggled]),
      ${e}[nu-toggled]:not([disabled]):not([tabindex]) {
        --nu-toggle-color: rgba(0, 0, 0, var(--nu-theme-shadow-opacity));
      }

      ${e}[special] {
        background-color: var(--nu-theme-special-color) !important;
        color: var(--nu-theme-special-background-color) !important;
      }
    `}}class fn extends Qe{static get nuTag(){return "nu-tablist"}static get nuRole(){return "tablist"}static get nuAttrs(){return {value:""}}static get nuDefaults(){return {gap:1}}static nuCSS({nuTag:e}){return `
      ${e}:not([gap]) > * {
        --nu-flex-gap: 1rem;
      }
    `}nuChanged(e,n,t){(super.nuChanged(e,n,t),!!this.nuIsMounted)&&("value"===e?this.nuSetValue(t,!1):void 0);}nuConnected(){super.nuConnected(),setTimeout(()=>{const e=this.nuGetValue();e?this.nuSetValue(e,!1):setTimeout(()=>{const e=this.querySelector(`nu-tab[value]:not([disabled]), nu-tab[controls]:not([disabled])`);e&&this.nuSetValue(e.nuGetValue());},0);},0);}nuGetValue(){const e=this.getAttribute("value");if(e){const n=this.querySelector(`nu-tab[aria-pressed="true"]:not([disabled])`);return n?n.nuGetValue():e}}nuSetValue(e,n=!0){setTimeout(()=>{[...this.childNodes].forEach(n=>{"NU-TAB"!==n.tagName||(n.nuGetValue()===e?(n.nuSetValue(!0),n.nuSetAria("selected",!0),n.nuSetFocusable(!1)):(n.nuSetValue(!1),n.nuSetAria("selected",!1),n.nuSetFocusable(!0)));}),n&&this.nuEmit("input",e);},0);}}const pn="down",hn="left",mn="right",gn="top",bn="bottom",vn={up:bn,[mn]:hn,[pn]:gn,[hn]:mn},yn={up:gn,[mn]:mn,[pn]:bn,[hn]:hn};class xn extends Ge{static get nuTag(){return "nu-triangle"}static get nuAttrs(){return {dir(e){e=e||"up";const n=yn[e];if(n){const t=vn[e];return {border:"calc(var(--nu-triangle-basis) / 2) solid transparent",[`border-${n}`]:"0",[`border-${t}-color`]:"currentColor",[`border-${t}-width`]:"var(--nu-triangle-height)"}}},size(e){if(e){const n=e.split(/\s+/);return {"--nu-triangle-basis":t(n[1]||2*n[0]+""),"--nu-triangle-height":t(n[0])}}}}}static get nuDefaults(){return {display:"block",dir:"up",size:".5em 1em",color:"border",mod:"no-overflow"}}static nuCSS({nuTag:e}){return `
      ${e} {
        width: 0;
        height: 0;
        vertical-align: middle;
      }
      ${e}[inline] {
        position: relative;
        bottom: 0.0675em;
      }
    `}}class kn extends De{static get nuTag(){return "nu-tooltip"}static get nuDefaults(){return {shadow:"",padding:".25 .5",z:"front",opacity:"0 ^:hover[1]",transition:"opacity",place:"outside-top",background:"",radius:"1x",border:"1x outside",size:"sm",events:"none"}}nuConnected(){super.nuConnected();const e=this.parentNode;e&&e.nuElement&&!e.hasAttribute("describedby")&&this.parentNode.setAttribute("describedby",this.nuId);}}const wn=r("border-spacing",{convert:!0,multiplier:"var(--nu-theme-padding)",empty:"var(--nu-theme-padding)"}),Cn=Ge.nuAttrs.border;class Sn extends Ge{static get nuTag(){return "nu-table"}static get nuRole(){return "table"}static get nuAttrs(){return {gap(e){return null==e?void 0:e?{"border-collapse":"separate",...wn(e)}:{"border-collapse":"collapse"}},border(e){const n=Cn(e);return [{...n,$suffix:" nu-cell:not([border])"},{...n,$suffix:" nu-columnheader:not([border])"}]},padding:r("--nu-padding",{multiplier:"var(--nu-theme-padding)",empty:"var(--nu-theme-padding)",convert:!0}),radius:null}}static get nuDefaults(){return {display:"table",gap:"",border:"1x",padding:""}}static nuCSS({nuTag:e}){return `
      ${e}{ overflow: hidden; }
      
      ${e} >  nu-rowgroup:first-child >  nu-row:first-child > * {
        border-top: 0 !important;
      }
      
      ${e} >  nu-rowgroup:last-child >  nu-row:last-child > * {
        border-bottom: 0 !important;
      }
      
      ${e} >  nu-rowgroup >  nu-row > *:first-child {
        border-left: 0 !important;
      }
      
      ${e} > nu-rowgroup > nu-row > *:last-child {
        border-right: 0 !important;
      }
    `}}class An extends Ge{static get nuTag(){return "nu-row"}static get nuRole(){return "row"}static get nuDefaults(){return {display:"table-row",background:""}}}class Nn extends Ge{static get nuTag(){return "nu-rowgroup"}static get nuRole(){return "rowgroup"}static get nuDefaults(){return {display:"table-row-group"}}}const Tn=Ge.nuAttrs.border;class En extends Ge{static get nuTag(){return "nu-cell"}static get nuRole(){return "cell"}static get nuAttrs(){return {radius:r("border-radius",{multiplier:"var(--nu-border-radius)",empty:"var(--nu-border-radius)",convert:!0}),border(e){return null==e?void 0:e?Tn(e):{border:"var(--nu-border-width)"}}}}static get nuDefaults(){return {display:"table-cell",padding:"var(--nu-padding)"}}}class $n extends En{static get nuTag(){return "nu-columnheader"}static get nuRole(){return "columnheader"}static get nuDefaults(){return {display:"table-cell",color:"minor",background:"minor-background",mod:"w6"}}nuConnected(){super.nuConnected();const e=this.parentNode&&this.parentNode.parentNode;e&&"rowgroup"===e.constructor.nuRole&&e.setAttribute("display","table-header-group");}}class Vn extends xe{nuConnected(){super.nuConnected(),!this.parentNode;}get nuParentContext(){return `#${this.parentNode.nuId}`}}class Rn extends Vn{static get nuTag(){return "nu-theme"}static get nuAttrsList(){return we}nuChanged(e,n,t){this.nuIsMounted&&this.nuApply();}nuConnected(){super.nuConnected(),this.nuIsMounted||setTimeout(()=>this.nuApply());}nuDisconnected(){super.nuDisconnected();const e=this.getAttribute("name");this.nuParent&&this.nuParent.nuDeclareTheme(e||"default");}nuApply(){const e=this.getAttribute("name");let n=Q(this);if(!e){const e=[...this.parentNode.querySelectorAll("nu-theme:not([name])")].find(e=>e.parentNode===this.parentNode);if(e){const t=Q(e);n={light:{...t.light,...n.light},dark:{...t.dark,...n.dark}};}}this.parentNode.nuDeclareTheme(e||"default",n.light,n.dark);}}class In extends Vn{static get nuTag(){return "nu-mod"}static get nuAttrsList(){return ["name"]}nuConnected(){super.nuConnected(),this.nuApply();}nuApply(){const e=this.parentNode,n=this.getAttribute("name"),t=this.nuParentContext;return n?void setTimeout(()=>{he.set(n,H(this.innerText),t),[...e.querySelectorAll(`
        ${t} [mod="${n}"],
        ${t} [mod*=" ${n} "],
        ${t} [mod^="${n} "],
        ${t} [mod$=" ${n}"]
      `)].forEach(e=>{e.nuApplyCSS&&e.nuApplyCSS("mod",e.getAttribute("mod"),!0);});},0):l(`modifier name is not specified`,this)}}class zn extends Vn{static get nuTag(){return "nu-var"}static get nuAttrsList(){return ["name","value"]}nuConnected(){super.nuConnected(),this.nuApply();}nuApply(){const e=this.parentNode,n=this.getAttribute("name"),t=this.getAttribute("value"),r=this.nuParentContext;return n&&t?void setTimeout(()=>{const d=t.split("|").map(e=>`${n}:${e}`).join("|").replace(/\[.+?\]/gi,e=>`[${n}:${e.slice(1,-1)}]`),o=e.nuGetCSS(r,"var",d);W(`var:${n}:${r}`,r,"body{--nu-base:16px;--nu-pixel:1px;--nu-default-border-radius:0.5rem;--nu-default-padding:0.5rem;--nu-default-border-width:1px;--nu-default-animation-time:0.08s;--nu-default-color:#333;--nu-default-background-color:#fff;--nu-default-border-color:#d2ddec;--nu-default-special-color:#1885d9;--nu-default-shadow-color:rgba(0,0,0,0.2);--nu-default-special-background-color:#fff;--nu-default-shadow-intensity:0.2;--nu-default-shadow-opacity:0.1;--nu-default-focus-color:#8bc2ec;--nu-default-heading-color:#474747;--nu-default-hover-color:rgba(24,133,217,0.1);--nu-default-special-hover-color:hsla(0,0%,100%,0.1);--nu-default-special-shadow-opacity:0.35538111934997146;--nu-theme-border-radius:var(--nu-default-border-radius);--nu-theme-padding:var(--nu-default-padding);--nu-theme-border-width:var(--nu-default-border-width);--nu-theme-animation-time:var(--nu-default-animation-time);--nu-theme-color:var(--nu-default-color);--nu-theme-background-color:var(--nu-default-background-color);--nu-theme-border-color:var(--nu-default-border-color);--nu-theme-special-color:var(--nu-default-special-color);--nu-theme-shadow-color:var(--nu-default-shadow-color);--nu-theme-special-background-color:var(--nu-default-special-background-color);--nu-theme-shadow-intensity:var(--nu-default-shadow-intensity);--nu-theme-shadow-opacity:var(--nu-default-shadow-opacity);--nu-theme-focus-color:var(--nu-default-focus-color);--nu-theme-heading-color:var(--nu-default-heading-color);--nu-theme-hover-color:var(--nu-default-hover-color);--nu-theme-special-hover-color:var(--nu-default-special-hover-color);--nu-theme-special-shadow-opacity:var(--nu-default-special-shadow-opacity)}body:not(.nu-prevent-defaults){line-height:1}body:not(.nu-prevent-defaults)>:not([size]){line-height:1.5}.nu-defaults,body:not(.nu-prevent-defaults){margin:0;padding:0;font-family:Avenir Next,Avenir,Helvetica,Ubuntu,DejaVu Sans,Arial,sans-serif;font-size:var(--nu-base);color:var(--nu-theme-color);background:var(--nu-theme-background-color);font-weight:400;word-spacing:.125rem;min-height:100vh;text-align:left;text-size-adjust:none}.nu-defaults:not(body){line-height:1.5}[nu-hidden]{display:none!important}html.nu-prefers-contrast-high.nu-prefers-color-scheme-dark body{filter:invert(100%) brightness(.666) contrast(1.5) brightness(1.5) invert(100%)}@media (prefers-color-scheme:dark){html.nu-prefers-color-scheme body{background:#202020}html.nu-prefers-color-scheme .nu-dark-invert{filter:invert(100%) hue-rotate(180deg)}html.nu-prefers-color-scheme .nu-dark-dim{filter:invert(5%)}html.nu-prefers-contrast-high.nu-prefers-color-scheme body{filter:invert(100%) brightness(.666) contrast(1.5) brightness(1.5) invert(100%)}}@media (prefers-color-scheme:light){html.nu-prefers-contrast-high.nu-prefers-color-scheme body{filter:brightness(.5) contrast(1.5) brightness(2)}}html.nu-prefers-contrast-high:not(.nu-prefers-color-scheme):not(.nu-prefers-color-scheme-dark) body{filter:brightness(.5) contrast(1.5) brightness(2)}html.nu-prefers-color-scheme-dark body{background:#2b2b2b}html.nu-prefers-color-scheme-dark .nu-dark-invert{filter:invert(95%) hue-rotate(180deg)}html.nu-prefers-color-scheme-dark .nu-dark-dim{filter:invert(5%)}@media (prefers-reduced-motion:reduce){.nu-prefers-reduced-motion [nu-themes],.nu-prefers-reduced-motion [theme]{--nu-theme-animation-time:0.001s}}.nu-prefers-reduced-motion-reduce [nu-themes],.nu-prefers-reduced-motion-reduce [theme]{--nu-theme-animation-time:0.001s!important}");},0):l(`modifier name or value is not specified`,this)}}let Ln,Mn;window.addEventListener("mousedown",Y),window.addEventListener("keydown",_);const Bn={tags:{},modifiers:he,css:fe,helpers:{invertColor:m,hueRotate:g,injectScript:e,extractColor:c,setAlphaChannel:f,generalizeColor:h,getLuminance:b,splitStates:N,convertCustomUnit:E,splitDimensions:x,excludeMod:V,parseAllValues:R,mixColors:v,setImmediate:z},version:"0.6.31"};return Bn.init=(...e)=>{e.forEach(e=>{Bn.tags[e.nuTag]||(e.nuInit(),Bn.tags[e.nuTag]=e);});},Bn.getElementById=function(e){return document.querySelector(`[nu-id="${e}"]`)},Bn.getElementsById=function(e){return document.querySelectorAll(`[nu-id="${e}"]`)},Bn.elements={NuGrid:Oe,NuBlock:De,NuHeading:Fe,NuBtn:Ze,NuTab:en,NuCard:Ye,NuIcon:Ue,NuLayout:Je,NuLine:Ke,NuPane:_e,NuGridTable:tn,NuBadge:rn,NuInput:on,NuScroll:un,NuSwitch:nn,NuFlex:Qe,NuBtnGroup:ln,NuTablist:fn,NuMenu:sn,NuMenuItem:cn,NuLink:dn,NuTheme:Rn,NuMod:In,NuVar:zn,NuDecorator:Vn,NuTriangle:xn,NuTooltip:kn,NuCell:En,NuColumnHeader:$n,NuRow:An,NuRowGroup:Nn,NuTable:Sn},Bn.init(...Object.values(Bn.elements)),Bn.elements.NuBase=xe,window.Nude=Bn,Bn}();

    const app = new App$1({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=main.ba3017ce.js.map

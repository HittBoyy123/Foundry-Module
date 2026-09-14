/** Leading refresh plus a bounded trailing refresh: continuous movement cannot
 * postpone updates indefinitely. A given window never renders concurrently. */
export function createLiveGatheringRefresh(getApplications, schedule = setTimeout, accepts = application => application.workbenchState.tab === "gather") {
  let timer = null;
  let dirty = false;
  const pending = new WeakMap();
  function refresh(application) {
    if (pending.has(application)) { pending.set(application, true); return; }
    pending.set(application, false);
    Promise.resolve().then(() => application.render({ force: true })).catch(error => {
      console.error("Wrathmaker | Gathering refresh failed", error);
    }).finally(() => {
      const again = pending.get(application);
      pending.delete(application);
      if (again && accepts(application)) refresh(application);
    });
  }
  function flush() {
    dirty = false;
    for (const application of getApplications()) {
      if (accepts(application)) refresh(application);
    }
    timer = schedule(() => {
      timer = null;
      if (dirty) flush();
    }, 75);
  }
  return () => { dirty = true; if (timer === null) flush(); };
}

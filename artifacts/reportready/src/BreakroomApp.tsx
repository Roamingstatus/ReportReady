import { Route, Router, Switch } from "wouter";
import Breakroom from "@/pages/Breakroom";

export function BreakroomApp() {
  return (
    <Router>
      <Switch>
        <Route path="/breakroom" component={Breakroom} />
        <Route path="/breakroom/*" component={Breakroom} />
      </Switch>
    </Router>
  );
}

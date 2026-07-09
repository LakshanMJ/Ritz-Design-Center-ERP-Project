import React from "react";
import Select, { components } from "react-select";

const options = [
  { label: "Option 1", value: 1 },
  { label: "Option 2", value: 2 },
  { label: "Option 3", value: 3 }
];

const Input = (props: any) => {
  const { autoComplete = props.autoComplete } = props.selectProps;
  return <components.Input {...props} autoComplete={autoComplete} />;
};

const App = (props: any) => {
  return (
    <Select
      components={{ Input }}
      // autoComplete="new-password"
      options={options}
    />
  );
};

export default App;
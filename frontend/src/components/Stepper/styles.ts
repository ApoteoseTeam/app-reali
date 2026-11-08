
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 8,
  },

  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  stepWrapper: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },

  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  activeCircle: {
    backgroundColor: "#70AE27",
  },

  circleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#17200F",
  },

  connector: {
    position: "absolute",
    height: 2,
    backgroundColor: "#B8B8B8",
    width: "100%",
    left: "50%",
    top: 18,
    zIndex: 1,
  },

  stepLabel: {
    marginTop: 9,
    fontSize: 10,
    fontWeight: "600",
    color: "#315C4B",
    textAlign: "center",
  },
});

export default styles;

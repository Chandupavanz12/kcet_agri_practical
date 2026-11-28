import Head from "expo-router/head";
import LoginScreen from "../src/screens/LoginScreen";

export default function Page() {
  return (
    <>
      <Head>
        <title>
          StudyHack — KCET, Agri Practical, NEET &amp; PUC Free Preparation, Study Materials &amp; Mock Tests
        </title>
        <meta
          name="description"
          content="Sign in to StudyHack for free KCET, KCET Agri Practical, NEET, and PUC study materials, previous year question papers (PYQs), timed mock tests, and video guidance."
        />
      </Head>
      <LoginScreen />
    </>
  );
}

import Head from "expo-router/head";
import IndexScreen from "../src/screens/IndexScreen";

export default function Page() {
  return (
    <>
      <Head>
        <title>
          StudyHack — KCET, Agri Practical, NEET &amp; PUC Free Preparation, Study Materials &amp; Mock Tests
        </title>
        <meta
          name="description"
          content="StudyHack is your complete free preparation hub for KCET, KCET Agri Practical, NEET, and PUC. Access free chapter study materials, previous year question papers (PYQs), timed mock tests, practical video guidance, and instant analytics."
        />
      </Head>
      <IndexScreen />
    </>
  );
}

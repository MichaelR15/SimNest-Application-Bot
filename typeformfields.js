module.exports = {
  NAME: "628ece10-07c2-4bd9-ab83-9b05fa1cf138",
  DISCORD_USERNAME: "d9da8ac3-5b4f-49cb-a364-616811e919de",
  DISCORD_ID: "ffd2d5c7-bc5f-42ed-80f0-0f092909db83",
  ROLE_APPLYING_FOR: "95670992-27f7-4f08-a6f2-63235387ad4c",
  MOTIVATION: "695ddbcd-3f06-4bcd-827a-9d5e13c72f36",
  CONFLICT: "fc8bcb6a-f3f1-4f41-a21c-9de81bdef745"
};

function getAnswer(answers, fieldId) {
  const a = answers.find(x => x.field?.id === fieldId);
  if (!a) return "Not provided";

  return (
    a.text ||
    a.choice?.label ||
    a.choices?.labels?.join(", ") ||
    "Not provided"
  );
}
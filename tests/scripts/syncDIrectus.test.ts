import { expect, test } from "@playwright/test";

import { createAttachments } from "../../scripts/syncDirectus";

test("createAttachments()", () => {
  const filesByAttachmentJunctionId = {
    1: { id: "a", mimeType: "application/pdf" },
    2: { id: "b", mimeType: "application/pdf" },
    3: {
      id: "c",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    4: { id: "d", mimeType: "image/png" },
    5: { id: "e", mimeType: "image/png" },
    6: { id: "f", mimeType: "image/jpeg" },
  };

  const simplest = createAttachments(filesByAttachmentJunctionId, [1, 4], {
    placeId: "Chicago, IL",
    nudgeType: "plant-based default",
    hasDistinctNudgeTypes: false,
    nudgeRecordIdx: null,
    citationIdx: null,
  });
  expect(simplest).toEqual({
    attachments: [{ fileName: "chicago-il-attachment.pdf", directusId: "a" }],
    screenshots: [{ fileName: "chicago-il-screenshot.png", directusId: "d" }],
  });

  const multipleCitations = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    {
      placeId: "Chicago, IL",
      nudgeType: "plant-based default",
      hasDistinctNudgeTypes: false,
      nudgeRecordIdx: null,
      citationIdx: 1,
    },
  );
  expect(multipleCitations).toEqual({
    attachments: [
      { fileName: "chicago-il-citation2-attachment.pdf", directusId: "a" },
    ],
    screenshots: [
      { fileName: "chicago-il-citation2-screenshot.png", directusId: "d" },
    ],
  });

  const multipleAttachments = createAttachments(
    filesByAttachmentJunctionId,
    [2, 3, 5, 6],
    {
      placeId: "Chicago, IL",
      nudgeType: "plant-based default",
      hasDistinctNudgeTypes: false,
      nudgeRecordIdx: null,
      citationIdx: null,
    },
  );
  expect(multipleAttachments).toEqual({
    attachments: [
      { fileName: "chicago-il-attachment1.pdf", directusId: "b" },
      { fileName: "chicago-il-attachment2.docx", directusId: "c" },
    ],
    screenshots: [
      { fileName: "chicago-il-screenshot1.png", directusId: "e" },
      { fileName: "chicago-il-screenshot2.jpg", directusId: "f" },
    ],
  });

  const distinctNudgeTypes = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    {
      placeId: "Chicago, IL",
      nudgeType: "plant-based default",
      hasDistinctNudgeTypes: true,
      nudgeRecordIdx: null,
      citationIdx: null,
    },
  );
  expect(distinctNudgeTypes).toEqual({
    attachments: [
      { fileName: "chicago-il-default-attachment.pdf", directusId: "a" },
    ],
    screenshots: [
      { fileName: "chicago-il-default-screenshot.png", directusId: "d" },
    ],
  });

  const multipleNudgeRecords = createAttachments(
    filesByAttachmentJunctionId,
    [1, 4],
    {
      placeId: "Chicago, IL",
      nudgeType: "climate-friendly ratio",
      hasDistinctNudgeTypes: false,
      nudgeRecordIdx: 1,
      citationIdx: null,
    },
  );
  expect(multipleNudgeRecords).toEqual({
    attachments: [
      { fileName: "chicago-il-ratio2-attachment.pdf", directusId: "a" },
    ],
    screenshots: [
      { fileName: "chicago-il-ratio2-screenshot.png", directusId: "d" },
    ],
  });

  const mostComplex = createAttachments(
    filesByAttachmentJunctionId,
    [2, 3, 5, 6],
    {
      placeId: "Chicago, IL",
      nudgeType: "climate-friendly ratio",
      hasDistinctNudgeTypes: true,
      nudgeRecordIdx: 1,
      citationIdx: 0,
    },
  );
  expect(mostComplex).toEqual({
    attachments: [
      {
        fileName: "chicago-il-ratio2-citation1-attachment1.pdf",
        directusId: "b",
      },
      {
        fileName: "chicago-il-ratio2-citation1-attachment2.docx",
        directusId: "c",
      },
    ],
    screenshots: [
      {
        fileName: "chicago-il-ratio2-citation1-screenshot1.png",
        directusId: "e",
      },
      {
        fileName: "chicago-il-ratio2-citation1-screenshot2.jpg",
        directusId: "f",
      },
    ],
  });
});

"use strict";

const _ = require("lodash");
const { expect } = require("chai");
const { Resource, MemoryDataStore } = require("../../../../");
const fixtures = require("../../../utils/fixtures");
const { helper } = require("../../../utils");
const { initTest } = require("./utils");

describe.skip("Edit Resource Mock", () => {
  describe("DELETE", () => {

    let api;
    beforeEach(() => {
      api = _.cloneDeep(fixtures.data.petStore);
    });

    it("should delete a resource", (done) => {
      initTest(api, (supertest) => {
        // Create a new pet
        supertest
          .post("/api/pets")
          .send({ Name: "Fido", Type: "dog" })
          .expect(201)
          .expect("Location", "/api/pets/Fido")
          .end(helper.checkResults(done, (res1) => {
            // Delete the pet
            supertest
              .delete("/api/pets/Fido")
              .expect(204, "")
              .end(helper.checkResults(done, (res2) => {
                // Confirm that it was deleted
                supertest
                  .get("/api/pets/Fido")
                  .expect(404)
                  .end(done);
              }));
          }));
      });
    });

    it("should delete a non-existent resource", (done) => {
      initTest(api, (supertest) => {
        // Delete a pet that doesn't exist
        supertest
          .delete("/api/pets/Fido")
          .expect(204, "")
          .end(helper.checkResults(done));
      });
    });

    it("should return the deleted resource if the OpenAPI definition schema is an object", (done) => {
      // Create a 200 response to return the deleted pet
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: {}
      };

      initTest(api, (supertest) => {
        // Create a new pet
        supertest
          .post("/api/pets")
          .send({ Name: "Fido", Type: "dog" })
          .expect(201)
          .end(helper.checkResults(done, (res1) => {
            // Delete the pet
            supertest
              .delete("/api/pets/Fido")
              .expect(200, { Name: "Fido", Type: "dog" })
              .end(helper.checkResults(done));
          }));
      });
    });

    it("should return the remaining resources in the collection if the OpenAPI definition schema is an array", (done) => {
      // Create a 200 response to return all pets in the collection
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: { type: "array", items: {}}
      };

      // Populate the collection
      let dataStore = new MemoryDataStore();
      let resources = [
        new Resource("/api/pets/Fluffy", { Name: "Fluffy", Type: "cat" }),
        new Resource("/api/pets/Fido", { Name: "Fido", Type: "dog" }),
        new Resource("/api/pets/Polly", { Name: "Polly", Type: "bird" })
      ];
      dataStore.save(resources, () => {

        initTest(dataStore, api, (supertest) => {
          // Delete one of the pets
          supertest
            .delete("/api/pets/Fido")
            .expect(200, [
              // The deleted pet should NOT be returned.  Only the rest of the collection
              { Name: "Fluffy", Type: "cat" },
              { Name: "Polly", Type: "bird" }
            ])
            .end(helper.checkResults(done));
        });
      });
    });

    it("should return the deleted resource if the OpenAPI definition schema is a wrapped object", (done) => {
      // Wrap the "pet" definition in an envelope object
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: {
          properties: {
            code: { type: "integer", default: 42 },
            message: { type: "string", default: "hello world" },
            error: {},
            result: _.cloneDeep(api.definitions.pet)
          }
        }
      };

      initTest(api, (supertest) => {
        // Create a new pet
        supertest
          .post("/api/pets")
          .send({ Name: "Fido", Type: "dog" })
          .expect(201)
          .end(helper.checkResults(done, (res1) => {
            // Delete the pet
            supertest
              .delete("/api/pets/Fido")
              .expect(200, { code: 42, message: "hello world", result: { Name: "Fido", Type: "dog" }})
              .end(helper.checkResults(done));
          }));
      });
    });

    it("should return the remaining resources in the collection if the OpenAPI definition schema is a wrapped array", (done) => {
      // Wrap the "pet" definition in an envelope object
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: {
          properties: {
            code: { type: "integer", default: 42 },
            message: { type: "string", default: "hello world" },
            error: {},
            result: { type: "array", items: _.cloneDeep(api.definitions.pet) }
          }
        }
      };

      // Populate the collection
      let dataStore = new MemoryDataStore();
      let resources = [
        new Resource("/api/pets/Fluffy", { Name: "Fluffy", Type: "cat" }),
        new Resource("/api/pets/Fido", { Name: "Fido", Type: "dog" }),
        new Resource("/api/pets/Polly", { Name: "Polly", Type: "bird" })
      ];
      dataStore.save(resources, () => {

        initTest(dataStore, api, (supertest) => {
          // Delete one of the pets
          supertest
            .delete("/api/pets/Fido")
            .expect(200, {
              code: 42,
              message: "hello world",
              result: [
                // The deleted pet should NOT be returned.  Only the rest of the collection
                { Name: "Fluffy", Type: "cat" },
                { Name: "Polly", Type: "bird" }
              ]
            })
            .end(helper.checkResults(done));
        });
      });
    });

    it("should not return the deleted resource on a 204 response, even if the OpenAPI definition schema is an object", (done) => {
      // 204 responses cannot return data
      api.paths["/pets/{PetName}"].delete.responses["204"].schema = {};

      initTest(api, (supertest) => {
        // Create a new pet
        supertest
          .post("/api/pets")
          .send({ Name: "Fido", Type: "dog" })
          .expect(201)
          .end(helper.checkResults(done, (res1) => {
            // Delete the pet
            supertest
              .delete("/api/pets/Fido")
              .expect(204, "")
              .end(helper.checkResults(done));
          }));
      });
    });

    it("should return nothing if nothing was deleted, even if the OpenAPI definition schema is an object", (done) => {
      // Create a 200 response to return the deleted pet
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: {}
      };

      initTest(api, (supertest) => {
        // Delete a non-existent pet
        supertest
          .delete("/api/pets/Fido")
          .expect(200, "")        // <--- empty results
          .end(helper.checkResults(done));
      });
    });

    it("should return an empty collection if nothing was deleted, even if the OpenAPI definition schema is an array", (done) => {
      // Create a 200 response to return all pets in the collection
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: { type: "array", items: {}}
      };

      initTest(api, (supertest) => {
        // Delete a non-existent pet from an empty collection
        supertest
          .delete("/api/pets/Fido")
          .expect(200, [])
          .end(helper.checkResults(done));
      });
    });

    it("should return `res.body` if already set by other middleware", (done) => {
      // Create a 200 response to return the deleted pet
      api.paths["/pets/{PetName}"].delete.responses["200"] = {
        description: "200 response",
        schema: {}
      };

      function messWithTheBody (req, res, next) {
        res.body = ["Not", "the", "response", "you", "expected"];
        next();
      }

      initTest(messWithTheBody, api, (supertest) => {
        supertest
          .delete("/api/pets/Fido")
          .expect(200, ["Not", "the", "response", "you", "expected"])
          .end(helper.checkResults(done));
      });
    });

    it("should return a 500 error if a DataStore error occurs", (done) => {
      let dataStore = new MemoryDataStore();
      dataStore.__openDataStore = function (collection, callback) {
        setImmediate(callback, new Error("Test Error"));
      };

      initTest(dataStore, api, (supertest) => {
        supertest
          .delete("/api/pets/Fido")
          .expect(500)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.text).to.contain("Error: Test Error");
            done();
          });
      });
    });

    describe("different data types", () => {
      it("should return a string", (done) => {
        // Create a 200 response to return a string
        api.paths["/pets/{PetName}"].delete.produces = ["text/plain"];
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: { type: "string" }
        };

        // Create a string resource
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", "I am Fido");
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the string resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "text/plain; charset=utf-8")
              .expect(200, "I am Fido")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return an empty string", (done) => {
        // Create a 200 response to return a string
        api.paths["/pets/{PetName}"].delete.produces = ["text/plain"];
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: { type: "string" }
        };

        // Create an empty string resource
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", "");
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the string resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "text/plain; charset=utf-8")
              .expect(200, "")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return a number", (done) => {
        // Create a 200 response to return a number
        api.paths["/pets/{PetName}"].delete.produces = ["text/plain"];
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: { type: "number" }
        };

        // Create a number resource
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", 42.999);
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the number resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "text/plain; charset=utf-8")
              .expect(200, "42.999")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return a date", (done) => {
        // Create a 200 response to return a date
        api.paths["/pets/{PetName}"].delete.produces = ["text/plain"];
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: { type: "string", format: "date-time" }
        };

        // Create a date resource
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", new Date(Date.UTC(2000, 1, 2, 3, 4, 5, 6)));
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the date resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "text/plain; charset=utf-8")
              .expect(200, "2000-02-02T03:04:05.006Z")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return a Buffer (as a string)", (done) => {
        // Create a 200 response to return a Buffer
        api.paths["/pets/{PetName}"].delete.produces = ["text/plain"];
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: { type: "string" }
        };

        // Create a Buffer resource
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", new Buffer("hello world"));
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the Buffer resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "text/plain; charset=utf-8")
              .expect(200, "hello world")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return a Buffer (as JSON)", (done) => {
        // Create a 200 response to return a Buffer
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: {}
        };

        // Create a Buffer resource
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", new Buffer("hello world"));
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the Buffer resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "application/json; charset=utf-8")
              .expect(200, {
                type: "Buffer",
                data: [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]
              })
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return an undefined value", (done) => {
        // Create a 200 response to return an object
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: {}
        };

        // Create a resource with no value
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido");
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the undefined resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "application/json; charset=utf-8")
              .expect(200, "")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return a null value", (done) => {
        // Create a 200 response to return an object
        api.paths["/pets/{PetName}"].delete.responses["200"] = {
          description: "200 response",
          schema: {}
        };

        // Create a resource with a null value
        let dataStore = new MemoryDataStore();
        let resource = new Resource("/api/pets/Fido", null);
        dataStore.save(resource, () => {

          initTest(dataStore, api, (supertest) => {
            // Delete the null resource
            supertest
              .delete("/api/pets/Fido")
              .expect("Content-Type", "application/json; charset=utf-8")
              .expect(200, "null")
              .end(helper.checkResults(done));
          });
        });
      });

      it("should return multipart/form-data", (done) => {
        // Create a 200 response to return an object
        api.paths["/pets/{PetName}/photos/{ID}"].delete.responses[200] = {
          description: "200 response",
          schema: {}
        };

        initTest(api, (supertest) => {
          // Save a pet photo (multipart/form-data)
          supertest
            .post("/api/pets/Fido/photos")
            .field("Label", "Photo 1")
            .field("Description", "A photo of Fido")
            .attach("Photo", fixtures.paths.oneMB)
            .expect(201)
            .end(helper.checkResults(done, (res1) => {

              // Delete the photo
              supertest
                .delete(res1.headers.location)
                .expect("Content-Type", "application/json; charset=utf-8")
                .expect(200)
                .end(helper.checkResults(done, (res2) => {
                  expect(res2.body).to.deep.equal({
                    ID: res2.body.ID,
                    Label: "Photo 1",
                    Description: "A photo of Fido",
                    Photo: {
                      fieldname: "Photo",
                      originalname: "1MB.jpg",
                      name: res2.body.Photo.name,
                      encoding: "7bit",
                      mimetype: "image/jpeg",
                      path: res2.body.Photo.path,
                      extension: "jpg",
                      size: 683709,
                      truncated: false,
                      buffer: null
                    }
                  });
                  done();
                }));
            }));
        });
      });

      it("should return a file", (done) => {
        // Create a 200 response to return a file
        api.paths["/pets/{PetName}/photos/{ID}"].delete.responses[200] = {
          description: "200 response",
          schema: { type: "file" }
        };

        initTest(api, (supertest) => {
          // Save a pet photo (multipart/form-data)
          supertest
            .post("/api/pets/Fido/photos")
            .field("Label", "Photo 1")
            .field("Description", "A photo of Fido")
            .attach("Photo", fixtures.paths.oneMB)
            .expect(201)
            .end(helper.checkResults(done, (res1) => {

              // Delete the photo
              supertest
                .delete(res1.headers.location)
                .expect("Content-Type", "image/jpeg")
                .expect(200)
                .end(helper.checkResults(done, (res2) => {
                  // It should NOT be an attachment
                  expect(res2.headers["content-disposition"]).to.be.undefined;

                  expect(res2.body).to.be.an.instanceOf(Buffer);
                  expect(res2.body.length).to.equal(683709);
                  done();
                }));
            }));
        });
      });

      it("should return a file attachment", (done) => {
        // Create a 200 response to return a file
        api.paths["/pets/{PetName}/photos/{ID}"].delete.responses[200] = {
          description: "200 response",
          schema: { type: "file" },
          headers: {
            location: {
              type: "string"
            },
            "content-disposition": {
              type: "string",
              default: "attachment"
            }
          }
        };

        initTest(api, (supertest) => {
          // Save a pet photo (multipart/form-data)
          supertest
            .post("/api/pets/Fido/photos")
            .field("Label", "Photo 1")
            .field("Description", "A photo of Fido")
            .attach("Photo", fixtures.paths.oneMB)
            .expect(201)
            .end(helper.checkResults(done, (res1) => {
              // Get the file name from the "Location" HTTP header
              let fileName = res1.headers.location.match(/\d+$/)[0];

              // Delete the photo
              supertest
                .delete(res1.headers.location)
                .expect("Content-Type", "image/jpeg")
                .expect(200)
                .expect("Content-Disposition", 'attachment; filename="' + fileName + '"')
                .end(helper.checkResults(done, (res2) => {
                  expect(res2.body).to.be.an.instanceOf(Buffer);
                  expect(res2.body.length).to.equal(683709);
                  done();
                }));
            }));
        });
      });
    });
  });
});

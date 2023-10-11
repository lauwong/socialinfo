import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface UpvoteDoc extends BaseDoc {
  user: ObjectId;
  target: ObjectId;
}

export default class UpvoteConcept {

  public readonly upvotes;

  constructor(collectionName: string) {
    this.upvotes = new DocCollection<UpvoteDoc>(collectionName);
  }
  
  async cast(user: ObjectId, target: ObjectId) {
    await this.canCastVote(user, target);
    await this.upvotes.createOne({ user, target });
    return { msg: "Successfully upvoted!" };
  }

  async retract(user: ObjectId, target: ObjectId) {

    await this.alreadyVoted(user, target);
    await this.upvotes.deleteOne({ user, target });
    return { msg: "Upvote removed successfully!" };
  }

  async countVotes(target: ObjectId) {
    const votes = await this.upvotes.readMany({ target });
    return { msg: "Upvotes successfully tallied!", count: votes.length};
  }

  async getMostUpvoted(items: ObjectId[]): Promise<ObjectId> {

    if (items.length === 0) {
      throw new NotAllowedError(`No items to check!`);
    }

    let top_item: ObjectId = items[0];
    let max_votes: number = -1;

    for (const item of items) {
      const curr_votes = (await this.countVotes(item)).count;
      if (curr_votes > max_votes) {
        top_item = item;
        max_votes = curr_votes;
      }
    }
    return top_item;
  }

  private async canCastVote(user: ObjectId, target: ObjectId) {
    const upvote = await this.upvotes.readOne({ user, target });
    if (upvote !== null) {
      throw new AlreadyUpvotedError(user, target);
    }
  }

  private async alreadyVoted(user: ObjectId, target: ObjectId) {
    const upvote = await this.upvotes.readOne({ user, target });
    if (upvote === null) {
      throw new NotUpvotedError(user, target);
    }
  }
}

export class AlreadyUpvotedError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly target: ObjectId,
  ) {
    super("{0} already upvoted {1}!", user, target);
  }
}

export class NotUpvotedError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly target: ObjectId,
  ) {
    super("{0} has not upvoted {1}!", user, target);
  }
}